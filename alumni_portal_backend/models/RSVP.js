const mongoose = require("mongoose");

const rsvpSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    yearOfGraduation: String,
    courseDept: String,
    organization: String,
    designation: String,
    city: String,
    email: { type: String, required: true },
    contactNumber: String,
    attending: String,
    accompaniedByFamily: String,
    adults: String,
    kids: String,
    eventsDay1: {
      networking: Boolean,
      campusTour: Boolean,
      entrepreneurshipTalk: Boolean,
      alumniTalk: Boolean,
      spotGames: Boolean,
      interactionSessions: Boolean,
      memoryWall: Boolean,
      teaBreak: Boolean,
      askMeAnything: Boolean,
      inauguration: Boolean,
      culturalProgram: Boolean,
      dinner: Boolean,
    },
    eventsDay2: {
      plantingSaplings: Boolean,
      breakfast: Boolean,
      excursionSasithithlu: Boolean,
      excursionKudremukh: Boolean,
    },
    dietaryPreference: String,
    needAccommodation: String,
    suggestions: String,
    consent: Boolean,
    signature: String,
    date: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("RSVP", rsvpSchema);

