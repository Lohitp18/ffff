const express = require("express");
const { createRSVP, getRSVPStatus } = require("../controllers/rsvpController");

const router = express.Router();

// Public RSVP status endpoint
router.get("/status", getRSVPStatus);

// Public RSVP endpoint (no auth required)
router.post("/", createRSVP);

module.exports = router;
