require('dotenv').config(); // Load environment variables
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use CloudinaryStorage with Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products', // Specify the folder in Cloudinary
    format: async (req, file) => 'jpeg', // Supports 'png', 'jpeg', etc.
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Unique file name
  },
});

// Initialize Multer
const upload = multer({ storage });

module.exports=upload;