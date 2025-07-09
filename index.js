const express = require('express');
const cors = require('cors');
const { File } = require('megajs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA File Downloader API is running.');
});

app.get('/api/file', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('https://mega.nz/file/')) {
    return res.status(400).json({ error: 'Invalid or missing MEGA file URL' });
  }

  try {
    const file = File.fromURL(url);
    const stream = file.download();

    await file.loadAttributes(); // Load metadata

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download MEGA file', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
