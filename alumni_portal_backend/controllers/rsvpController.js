const RSVP = require("../models/RSVP");

// POST /api/rsvp
exports.createRSVP = async (req, res) => {
  try {
    const data = req.body || {};

    if (!data.fullName || !data.email) {
      return res.status(400).json({ message: "Full name and email are required" });
    }

    const rsvp = await RSVP.create(data);
    return res.status(201).json({ message: "RSVP saved successfully", rsvp });
  } catch (error) {
    console.error("createRSVP error", error);
    return res.status(500).json({ message: "Failed to save RSVP" });
  }
};

// GET /api/admin/rsvps
exports.listRSVPs = async (_req, res) => {
  try {
    const rsvps = await RSVP.find({}).sort({ createdAt: -1 }).lean();
    return res.json(rsvps);
  } catch (error) {
    console.error("listRSVPs error", error);
    return res.status(500).json({ message: "Failed to fetch RSVPs" });
  }
};

// GET /api/admin/rsvps/export
exports.exportRSVPs = async (_req, res) => {
  try {
    const rsvps = await RSVP.find({}).sort({ createdAt: -1 }).lean();

    const day1Keys = [
      "networking", "campusTour", "entrepreneurshipTalk", "alumniTalk",
      "spotGames", "interactionSessions", "memoryWall", "teaBreak",
      "askMeAnything", "inauguration", "culturalProgram", "dinner"
    ];
    const day2Keys = ["plantingSaplings", "breakfast", "excursionSasithithlu", "excursionKudremukh"];

    const rows = rsvps.map((r) => {
      const d1 = r.eventsDay1 || {};
      const d2 = r.eventsDay2 || {};
      const base = {
        FullName: r.fullName || "",
        YearOfGraduation: r.yearOfGraduation || "",
        CourseDept: r.courseDept || "",
        Organization: r.organization || "",
        Designation: r.designation || "",
        City: r.city || "",
        Email: r.email || "",
        ContactNumber: r.contactNumber || "",
        Attending: r.attending || "",
        AccompaniedByFamily: r.accompaniedByFamily || "",
        Adults: r.adults || "",
        Kids: r.kids || "",
        DietaryPreference: r.dietaryPreference || "",
        NeedAccommodation: r.needAccommodation || "",
        Suggestions: r.suggestions || "",
        Consent: r.consent ? "Yes" : "No",
        DateField: r.date || "",
        CreatedAt: r.createdAt ? r.createdAt.toISOString() : "",
      };
      day1Keys.forEach((k) => { base[`Day1_${k}`] = d1[k] ? "Yes" : "No"; });
      day2Keys.forEach((k) => { base[`Day2_${k}`] = d2[k] ? "Yes" : "No"; });
      return base;
    });

    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const v = row[h] ?? "";
            const s = String(v).replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(",")
      ),
    ];

    const csv = csvLines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="alumni_rsvp_${Date.now()}.csv"`
    );
    return res.status(200).send(csv);
  } catch (error) {
    console.error("exportRSVPs error", error);
    return res.status(500).json({ message: "Failed to export RSVPs" });
  }
};

