const express = require('express');
const { Folder } = require('megajs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Folder Downloader API is running.');
});

// 🔍 List all files in a MEGA folder
app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing ?url= parameter" });

  try {
    const folder = new Folder({ url });
    await folder.loadAttributes();

    const files = folder.children.map(child => ({
      name: child.name,
      size: child.size,
      download_url: `/api/folder-download?url=${encodeURIComponent(url)}&file=${encodeURIComponent(child.name)}`
    }));

    res.json({ folder_name: folder.name || "Unnamed", files });
  } catch (err) {
    res.status(500).json({ error: "Failed to read folder", details: err.toString() });
  }
});

// 📥 Download specific file from MEGA folder
app.get('/api/folder-download', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.file;

  if (!url || !filename) {
    return res.status(400).json({ error: "Missing ?url= or ?file= parameter" });
  }

  try {
    const folder = new Folder({ url });
    await folder.loadAttributes();

    const file = folder.children.find(f => f.name === filename);
    if (!file) return res.status(404).json({ error: "File not found in folder" });

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = file.download();
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to download file", details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
