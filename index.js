const express = require('express');
const { file } = require('megajs');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 📁 List all files (recursive) from MEGA folder
app.get('/api/folder', async (req, res) => {
  const inputUrl = req.query.url;

  if (!inputUrl || !inputUrl.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Missing or invalid ?url=' });
  }

  try {
    // ✅ Extract folder ID and key from full URL
    const match = /folder\/([^#]+)#(.+)/.exec(inputUrl);
    if (!match) {
      return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
    }

    const [_, folderId, key] = match;
    const cleanedUrl = `https://mega.nz/folder/${folderId}#${key}`;

    // 🔗 MEGA API request
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
      return res.status(500).json({ error: 'Invalid MEGA folder response' });
    }

    const map = {};
    nodes.forEach(n => (map[n.h] = n));

    // 🔄 Recursive walker
    const walk = (parentId, path = '') => {
      return nodes
        .filter(n => n.p === parentId)
        .flatMap(n => {
          const name = n.name || n.n;
          if (n.t === 1) {
            return walk(n.h, `${path}${name}/`);
          } else {
            return {
              name: name,
              path: `${path}${name}`,
              size: n.s,
              download_url: `/api/folder-download?url=${encodeURIComponent(cleanedUrl)}&file=${encodeURIComponent(name)}`
            };
          }
        });
    };

    const root = nodes.find(n => n.h === folderId || (n.t === 1 && !n.p));
    if (!root) return res.status(404).json({ error: 'Root folder not found' });

    const files = walk(root.h);

    res.json({
      folder_id: folderId,
      total_files: files.length,
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process folder', details: err.toString() });
  }
});

// 📥 Download file
app.get('/api/folder-download', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.file;

  if (!url || !filename) {
    return res.status(400).json({ error: 'Missing ?url or ?file' });
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
  console.log(`✅ MEGA API running on http://localhost:${PORT}`);
});
