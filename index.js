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
  const key = req.query.key;

  console.log('➡️ /api/folder request received');
  console.log('🟡 Folder URL:', url);
  console.log('🔑 Decryption Key:', key);

  if (!url || !key || !url.includes('mega.nz/folder/')) {
    return res.status(400).json({ error: 'Missing or invalid folder URL or key' });
  }

  // Extract folder ID only (without key)
  const folderIdMatch = url.match(/mega\.nz\/folder\/([\w-]+)/);
  if (!folderIdMatch || folderIdMatch.length < 2) {
    return res.status(400).json({ error: 'Invalid MEGA folder URL format' });
  }

  const folderId = folderIdMatch[1];
  const fullUrl = `https://mega.nz/folder/${folderId}#${key}`;

  try {
    const folder = Folder.fromURL(fullUrl);
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
