const express = require('express');
const cors = require('cors');
const mega = require('megajs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// List folder contents and support recursive structure
app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  console.log('➤ /api/folder called with URL:', url);

  if (!url || !url.startsWith('https://mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid or missing `url` parameter' });
  }

  try {
    const folder = mega.Folder.fromURL(url);
    await folder.loadAttributes();
    console.log('Folder attributes loaded:', folder.name);

    const results = folder.children.map(item => ({
      name: item.name,
      size: item.size,
      type: item.directory ? 'folder' : 'file',
      download_url: `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(item.name)}`
    }));

    res.json({
      folder_name: folder.name,
      total_items: results.length,
      items: results
    });
  } catch (error) {
    console.error('Error reading folder:', error);
    res.status(500).json({ error: 'Failed to read folder', details: error.toString() });
  }
});

// Download a specific file
app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  const name = req.query.name;
  console.log('➤ /api/download called:', url, name);

  if (!url || !name) {
    return res.status(400).json({ error: 'Missing `url` or `name` parameter' });
  }

  try {
    const folder = mega.Folder.fromURL(url);
    await folder.loadAttributes();

    const file = folder.children.find(f => f.name === name);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stream = file.download();
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file', details: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
