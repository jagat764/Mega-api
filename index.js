const express = require('express');
const cors = require('cors');
const mega = require('megajs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder API is running.');
});

app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  console.log("➡️ /api/folder");
  console.log("🟡 Incoming URL:", url);

  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Missing or invalid ?url=' });
  }

  try {
    const folder = mega.Folder.fromURL(url); // ✅ Use Folder from forked megajs
    await folder.loadAttributes();

    const files = folder.children.map(file => ({
      name: file.name,
      size: file.size,
      type: file.directory ? 'folder' : 'file',
      download_url: `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(file.name)}`
    }));

    res.json({
      folder_name: folder.name,
      total_files: files.length,
      files
    });
  } catch (err) {
    console.error("❌ Error loading folder:", err.toString());
    res.status(500).json({
      error: 'Failed to read folder',
      details: err.toString()
    });
  }
});

app.get('/api/download', async (req, res) => {
  const url = req.query.url;
  const name = req.query.name;

  if (!url || !name) {
    return res.status(400).json({ error: 'Missing ?url or ?name' });
  }

  try {
    const folder = mega.Folder.fromURL(url);
    await folder.loadAttributes();

    const file = folder.children.find(f => f.name === name);
    if (!file) return res.status(404).json({ error: 'File not found in folder' });

    const stream = file.download();
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    console.error("❌ Download error:", err.toString());
    res.status(500).json({ error: 'Download failed', details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MEGA API running at http://localhost:${PORT}`);
});
