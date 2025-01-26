const express = require("express");
const cors = require("cors"); // Import CORS middleware
const multer = require("multer"); // For file handling
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();

// Enable CORS for all origins (or specify the frontend origin)
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from this origin
  })
);

const upload = multer({ dest: "uploads/" }); // Temporary storage for uploaded files

// Google Drive API setup
const auth = new google.auth.GoogleAuth({
  keyFile: "slrmun25-d061b999f1f1.json", // Path to your service account key JSON
  scopes: ["https://www.googleapis.com/auth/drive"], // Full Drive access
});

const drive = google.drive({ version: "v3", auth });

// Endpoint to handle file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const email = req.body.email;
    const filePath = req.file.path; // Temporary file path
    const folderId = "1IVk7TzgTkOis45iAZSRvV2HFmPNY9RdO"; // Replace with the Google Drive folder ID

    // Rename the file with the user's email
    const newFilename = `${email}-${req.file.originalname}`;
    const newPath = path.join(req.file.destination, newFilename);

    fs.renameSync(filePath, newPath);
    console.log("File renamed:", newPath);

    const fileMetadata = {
      name: newFilename,
      parents: [folderId], // Uploads the file to the specified folder
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(newPath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata, // Correct property for metadata
      media: media,
      fields: "id, webViewLink", // Returns the file ID and a sharable link
    });

    // Clean up the renamed file
    fs.unlinkSync(newPath);

    res.status(200).json({ message: "File uploaded and renamed successfully", fileId: response.data.id });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: 'Error uploading file.' });
  }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});