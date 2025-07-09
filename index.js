const express = require('express');
const cors = require('cors');
const { Folder } = require('megajs');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA API is running');
});

app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  console.log('➡️ /api/folder request received');
  console.log('🟡 Folder URL:', url);

  if (!url || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Invalid MEGA folder URL' });
  }

  const folderRegex = /mega\.nz\/folder\/([a-zA-Z0-9-_]+)#([a-zA-Z0-9-_]+)/;
  const match = url.match(folderRegex);

  if (!match) {
    return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
  }

  const folderId = match[1];
  const folderKey = match[2];

  try {
    const folder = Folder.fromURL(`https://mega.nz/folder/${folderId}#${folderKey}`);
    const files = await folder.load();

    const result = files.map(file => ({
      name: file.name,
      size: file.size,
      downloadId: file.downloadId,
      downloadUrl: `https://mega.nz/file/${file.downloadId}#${file.key}`
    }));

    res.json({
      folderId,
      fileCount: result.length,
      files: result
    });
  } catch (err) {
    console.error('❌ Error loading folder:', err);
    res.status(500).json({
      error: 'Failed to read folder',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
