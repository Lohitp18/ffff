const express = require("express");
const { getBlobSasByUrl, getBlobSasByFilename } = require("../controllers/blobController");

const router = express.Router();

// Preferred for frontend that already stores full blob URLs
router.get("/sas", getBlobSasByUrl);

// Required shape per request
router.get("/:filename", getBlobSasByFilename);

module.exports = router;

