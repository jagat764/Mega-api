const express = require('express');
const cors = require('cors');
const mega = require('megajs');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ MEGA API is running');
});

app.get('/api/folder', async (req, res) => {
  const url = req.query.url;
  const key = req.query.key;

  console.log('➡️ /api/folder request received');
  console.log('🟡 Folder URL:', url);
  console.log('🔑 Decryption Key:', key);

  if (!url || !key) {
    return res.status(400).json({ error: 'Missing folder URL or decryption key' });
  }

  const folderIdMatch = url.match(/mega\.nz\/folder\/([\w-]+)/);
  if (!folderIdMatch) {
    return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
  }

  const folderId = folderIdMatch[1];
  const fullLink = `https://mega.nz/folder/${folderId}#${key}`;

  try {
    const storage = mega.Storage.fromURL(fullLink);
    storage.on('ready', () => {
      const files = Object.values(storage.files).map(file => ({
        name: file.name,
        size: file.size,
        downloadId: file.downloadId,
        downloadUrl: `https://mega.nz/file/${file.downloadId}#${file.key}`
      }));

      res.json({
        folderId,
        fileCount: files.length,
        files
      });
    });

    storage.on('error', (err) => {
      console.error('❌ Error loading MEGA folder:', err);
      res.status(500).json({
        error: 'Failed to read MEGA folder',
        details: err.message
      });
    });

    storage.load();
  } catch (err) {
    console.error('❌ Unexpected Error:', err);
    res.status(500).json({
      error: 'Unexpected failure',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
