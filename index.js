const express = require('express');
const { file } = require('megajs');
const cors = require('cors');
const fetch = require('node-fetch'); // MEGA folder metadata

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 📁 List files in MEGA folder recursively
app.get('/api/folder', async (req, res) => {
  let url = req.query.url;
  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid or missing ?url parameter' });
  }

  try {
    // ✂️ Strip trailing /folder/... or /file/... parts
    url = url.split('/folder/')[0];
    url = url.split('/file/')[0];

    // 🔍 Extract folder ID and key
    const match = url.match(/folder\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
    }

    const [_, folderId, key] = match;

    const apiUrl = `https://g.api.mega.co.nz/cs?id=${Date.now()}&n=${folderId}`;
    const body = JSON.stringify([{ a: 'f', c: 1 }]);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    const nodes = data[0]?.f;

    if (!Array.isArray(nodes)) {
      return res.status(500).json({ error: 'Invalid MEGA response format' });
    }

    // 🗺 Build a map of nodeId => node
    const map = {};
    nodes.forEach(n => (map[n.h] = n));

    // 🔄 Recursive folder walker
    const walk = (parentId, path = '') => {
      return nodes
        .filter(n => n.p === parentId)
        .flatMap(n => {
          const name = n.name || n.n;
          if (n.t === 1) {
            // Folder
            return walk(n.h, `${path}${name}/`);
          } else {
            // File
            return {
              name: name,
              path: `${path}${name}`,
              size: n.s,
              download_url: `/api/folder-download?url=${encodeURIComponent(url)}&file=${encodeURIComponent(name)}`
            };
          }
        });
    };

    const rootNode = nodes.find(n => n.h === folderId || (n.t === 1 && !n.p));
    if (!rootNode) return res.status(404).json({ error: 'Root folder not found' });

    const files = walk(rootNode.h);

    res.json({
      folder_id: folderId,
      total_files: files.length,
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process folder', details: err.toString() });
  }
});

// 📥 Download file from folder
app.get('/api/folder-download', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.file;

  if (!url || !filename) {
    return res.status(400).json({ error: 'Missing ?url or ?file parameter' });
  }

  try {
    const megaFile = file({ name: filename, url });
    await megaFile.loadAttributes();

    res.setHeader('Content-Disposition', `attachment; filename="${megaFile.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = megaFile.download();
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file', details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MEGA API running at http://localhost:${PORT}`);
});
