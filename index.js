const express = require("express");
const cors = require("cors");
const mega = require("megajs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Mega API is live. Use /api/folder?url=<folder>&key=<decryptionKey>");
});

// Folder route
app.get("/api/folder", async (req, res) => {
  const url = req.query.url;
  const key = req.query.key;

  if (!url || !key) {
    return res.status(400).json({ error: "Missing 'url' or 'key' query parameter" });
  }

  const folderIdMatch = url.match(/mega\.nz\/folder\/([a-zA-Z0-9_-]+)/);
  if (!folderIdMatch) {
    return res.status(400).json({ error: "Invalid MEGA folder URL format" });
  }

  const folderId = folderIdMatch[1];
  const fullLink = `https://mega.nz/folder/${folderId}#${key}`;

  console.log("➡️ /api/folder request received");
  console.log("🟡 Folder URL:", url);
  console.log("🔑 Decryption Key:", key);

  try {
    const folder = mega.File.fromURL(fullLink);

    folder.loadAttributes((err) => {
      if (err) {
        console.error("❌ Error loading attributes:", err);
        return res.status(500).json({ error: "Failed to load folder", details: err.message });
      }

      const files = [];
      let pending = folder.children.length;

      if (pending === 0) {
        return res.json({ folderId, fileCount: 0, files: [] });
      }

      folder.children.forEach(file => {
        file.link((err, url) => {
          if (err) {
            console.error("❌ Link error:", err);
            files.push({ name: file.name, size: file.size, downloadUrl: null });
          } else {
            files.push({ name: file.name, size: file.size, downloadUrl: url });
          }

          pending--;
          if (pending === 0) {
            res.json({ folderId, fileCount: files.length, files });
          }
        });
      });
    });

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    res.status(500).json({ error: "Unexpected failure", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
