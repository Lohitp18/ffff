const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  handleImageUpload,
  uploadProfileImage,
  uploadCoverImage,
} = require("../controllers/userController");
const { handlePostMediaUpload, createPost } = require("../controllers/postController");
const { deleteMedia, updateMediaPut } = require("../controllers/uploadController");

const router = express.Router();

router.post("/profile-image", authMiddleware, handleImageUpload, uploadProfileImage);
router.post("/cover-image", authMiddleware, handleImageUpload, uploadCoverImage);
router.post("/post", authMiddleware, handlePostMediaUpload, createPost);
router.post("/video", authMiddleware, handlePostMediaUpload, createPost);
router.delete("/media", authMiddleware, deleteMedia);
router.put("/media", authMiddleware, handleImageUpload, updateMediaPut);

module.exports = router;
