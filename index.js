const express = require('express');
const { file } = require('megajs');
const cors = require('cors');
const fetch = require('node-fetch'); // For folder metadata requests

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 🔍 List files in MEGA folder
app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid or missing ?url parameter' });
  }

  try {
    const match = url.match(/folder\/([a-zA-Z0-9_-]+)#([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid MEGA folder URL' });

    const [_, folderId, key] = match;
    const apiUrl = `https://g.api.mega.co.nz/cs?id=${Date.now()}&n=${folderId}`;
    const body = JSON.stringify([{ a: 'f', c: 1 }]);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    const files = data[0]?.f?.filter(item => item.t === 0) || [];

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

// 📥 Download a file by name from folder
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
