const express = require('express');
const { file } = require('megajs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA Downloader API is running.');
});

app.get('/api/megalink', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' parameter" });

  try {
    const megaFile = file({ url });
    await megaFile.loadAttributes();

    res.setHeader('Content-Disposition', `attachment; filename="${megaFile.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = megaFile.download();
    stream.pipe(res);

    stream.on('error', err => {
      res.status(500).json({ error: "Error while streaming file", details: err.toString() });
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to download", details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✅ MEGA API running on http://localhost:${PORT}`);
});
