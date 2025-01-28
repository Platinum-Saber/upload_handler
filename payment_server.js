const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();

// Increase request size limits in Express
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS
app.use(
  cors({
    origin: ["https://mun-rotaractmora.me", "http://localhost:3000"], // Allow frontend and local development
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.options("*", cors()); // Handle preflight requests

// Set upload size limit in Multer (50MB)
const upload = multer({ 
  dest: "uploads/", 
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Google Drive API authentication
const auth = new google.auth.GoogleAuth({
  keyFile: "slrmun25-d061b999f1f1.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const email = req.body.email;
    const filePath = req.file.path;
    const folderId = "1IVk7TzgTkOis45iAZSRvV2HFmPNY9RdO";

    const newFilename = `${email}-${req.file.originalname}`;
    const newPath = path.join(req.file.destination, newFilename);

    // Rename file
    try {
      fs.renameSync(filePath, newPath);
    } catch (err) {
      console.error("Error renaming file:", err);
      return res.status(500).json({ error: "File renaming failed." });
    }

    const fileMetadata = {
      name: newFilename,
      parents: [folderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(newPath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    // Clean up renamed file
    try {
      fs.unlinkSync(newPath);
    } catch (err) {
      console.error("Error deleting file:", err);
    }

    res.status(200).json({
      message: "File uploaded and renamed successfully",
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Handle file size limit errors from multer
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File size exceeds the limit of 50MB." });
    }

    res.status(500).json({ error: "Error uploading file." });
  }
});

// Start server
app.listen(5000, "0.0.0.0", () => {
  console.log("Server is running on port 5000");
});
