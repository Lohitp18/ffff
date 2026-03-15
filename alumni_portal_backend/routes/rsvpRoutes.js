const express = require("express");
const { createRSVP } = require("../controllers/rsvpController");

const router = express.Router();

// Public RSVP endpoint (no auth required)
router.post("/", createRSVP);

module.exports = router;

