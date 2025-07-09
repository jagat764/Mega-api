const express = require('express');
const { file } = require('megajs');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Root endpoint
app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 📁 Recursive folder listing with debug logs
app.get('/api/folder', async (req, res) => {
  const rawUrl = req.query.url;

  console.log("➡️ Incoming folder request");
  console.log("🟡 rawUrl:", rawUrl);

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.includes('mega.nz/folder/')) {
    console.log("❌ Missing or invalid ?url parameter");
    return res.status(400).json({ error: 'Missing or invalid ?url parameter' });
  }

  // ✅ Match folder ID and decryption key
  const match = rawUrl.match(/folder\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
  console.log("🔍 Regex match result:", match);

  if (!match) {
    console.log("❌ Regex failed to extract folder ID/key");
    return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
  }

  const [_, folderId, key] = match;
  const cleanUrl = `https://mega.nz/folder/${folderId}#${key}`;

  console.log("✅ Extracted folderId:", folderId);
  console.log("✅ Extracted key:", key);
  console.log("🔗 Clean MEGA URL:", cleanUrl);

  try {
    const apiUrl = `https://g.api.mega.co.nz/cs?id=${Date.now()}&n=${folderId}`;
    const body = JSON.stringify([{ a: 'f', c: 1 }]);

    console.log("📡 Sending request to MEGA:", apiUrl);
    console.log("📤 Body:", body);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    console.log("📥 MEGA API response received.");

    const nodes = data[0]?.f;

    if (!Array.isArray(nodes)) {
      console.log("❌ Invalid MEGA response format");
      return res.status(500).json({ error: 'Invalid MEGA response' });
    }

    const map = {};
    nodes.forEach(n => (map[n.h] = n));

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
              download_url: `/api/folder-download?url=${encodeURIComponent(cleanUrl)}&file=${encodeURIComponent(name)}`
            };
          }
        });
    };

    const root = nodes.find(n => n.h === folderId || (n.t === 1 && !n.p));
    if (!root) {
      console.log("❌ Root folder not found");
      return res.status(404).json({ error: 'Root folder not found' });
    }

    const files = walk(root.h);

    console.log("✅ Total files found:", files.length);

    res.json({
      folder_id: folderId,
      total_files: files.length,
      files
    });
  } catch (err) {
    console.log("🔥 ERROR:", err.toString());
    res.status(500).json({ error: 'Failed to process folder', details: err.toString() });
  }
});

// 📥 File downloader
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
    console.log("🔥 Download ERROR:", err.toString());
    res.status(500).json({ error: 'Failed to download file', details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MEGA API running at http://localhost:${PORT}`);
});
