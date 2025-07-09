const express = require('express');
const cors = require('cors');
const mega = require('megajs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://mega.nz/folder/')) {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    const folder = mega.Folder.fromURL(url);
    await folder.loadAttributes();

    const files = folder.children.map(item => ({
      name: item.name,
      size: item.size,
      type: item.directory ? 'folder' : 'file',
      download_url: `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(item.name)}`
    }));

    res.json({
      folder_name: folder.name,
      total_items: files.length,
      items: files
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read folder', details: err.toString() });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, name } = req.query;

  if (!url || !name) {
    return res.status(400).json({ error: 'Missing url or name' });
  }

  try {
    const folder = mega.Folder.fromURL(url);
    await folder.loadAttributes();

    const file = folder.children.find(f => f.name === name);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const stream = file.download();
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download', details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
