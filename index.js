const express = require('express');
const { file } = require('megajs');
const cors = require('cors');
const fetch = require('node-fetch'); // Needed for MEGA folder metadata requests

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 🏠 Root
app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 📁 List files in MEGA folder
app.get('/api/folder', async (req, res) => {
  let url = req.query.url;
  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid or missing ?url parameter' });
  }

  try {
    // ✂️ Clean trailing `/folder/...` or `/file/...`
    url = url.split('/folder/')[0];
    url = url.split('/file/')[0];

    // 🔍 Extract folder ID and decryption key
    const match = url.match(/folder\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
    }

    const [_, folderId, key] = match;

    // 🔗 Build MEGA API request
    const apiUrl = `https://g.api.mega.co.nz/cs?id=${Date.now()}&n=${folderId}`;
    const body = JSON.stringify([{ a: 'f', c: 1 }]);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    const files = data[0]?.f?.filter(item => item.t === 0) || [];

    // 📦 Return list of files
    const results = files.map(f => ({
      name: f.name || f.n,
      size: f.s,
      download_url: `/api/folder-download?url=${encodeURIComponent(url)}&file=${encodeURIComponent(f.name)}`
    }));

    res.json({ folder_id: folderId, files: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read folder', details: err.toString() });
  }
});

// 📥 Download file by name from MEGA folder
app.get('/api/folder-download', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.file;

  if (!url || !filename) {
    return res.status(400).json({ error: 'Missing ?url= or ?file= parameter' });
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
