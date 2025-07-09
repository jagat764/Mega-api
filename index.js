const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA API is running');
});

app.get('/api/file', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('mega.nz/file/')) {
    return res.status(400).json({ error: 'Invalid MEGA file URL' });
  }

  const { File } = require('megajs');
  try {
    const file = File.fromURL(url);
    await file.loadAttributes();
    const stream = file.download();

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    console.error('❌ Error downloading file:', err);
    res.status(500).json({ error: 'Failed to download file', details: err.message });
  }
});

// ✅ New route to debug folder API
app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  console.log('➡️ /api/folder request received');
  console.log('🟡 Folder URL:', url);

  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid MEGA folder URL' });
  }

  // Temporary debug response
  return res.json({
    message: '✅ /api/folder endpoint is working',
    folderUrl: url
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
