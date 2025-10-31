
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
let yu =10;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'recipes',
    resource_type: 'image',
    public_id: undefined,  
    overwrite: true
  })
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
