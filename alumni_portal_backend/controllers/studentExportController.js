const PDFDocument = require("pdfkit");
const User = require("../models/User");

const formatDateTime = (d) => {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString();
  } catch {
    return "";
  }
};

const formatDate = (d) => {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const buildStudentQuery = (req) => {
  const { institution, course, year, company, status } = req.query;

  const query = {};

  if (status && status !== "all") query.status = status;
  if (institution) query.institution = institution;
  if (course) query.course = course;
  if (year) query.year = year;

  if (company) {
    const companyFilter = String(company).trim();
    if (companyFilter) {
      query.$or = [
        { "privateInfo.currentCompany": { $regex: companyFilter, $options: "i" } },
        {
          "privateInfo.previousCompanies.company": {
            $regex: companyFilter,
            $options: "i",
          },
        },
      ];
    }
  }

  return query;
};

const flattenUserForCSV = (u) => ({
  FullName: u.name || "",
  Username: u.username || "",
  Email: u.email || "",
  Phone: u.phone || "",
  Institution: u.institution || "",
  Program: u.program || "",
  Course: u.course || "",
  Specialization: u.specialization || "",
  Year: u.year || "",
  DOB: formatDate(u.dob),
  Status: u.status || "",
  Role: u.role || "",
  Headline: u.headline || "",
  Bio: u.bio || "",
  Location: u.location || "",
  Website: u.website || "",
  LinkedIn: u.linkedin || "",
  Twitter: u.twitter || "",
  GitHub: u.github || "",
  Skills: Array.isArray(u.skills) ? u.skills.join("; ") : "",
  Experience: Array.isArray(u.experience) ? JSON.stringify(u.experience) : "",
  Education: Array.isArray(u.education) ? JSON.stringify(u.education) : "",
  PrivacyCurrentCompany: u.privateInfo?.currentCompany || "",
  PrivacyTotalExperience: u.privateInfo?.totalExperience != null ? u.privateInfo.totalExperience : "",
  PrivacyHasMasters: u.privateInfo?.hasMasters ? "Yes" : "No",
  SubmittedAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
});

const sendCSVResponse = (res, rows, filenameBase) => {
  const csvRows = rows.map((row) => {
    return { headers: Object.keys(row), values: Object.values(row) };
  });

  const headers =
    csvRows[0]?.headers || Object.keys(flattenUserForCSV({}));

  const csv = [
    headers.join(","),
    ...csvRows.map(({ values }) =>
      values
        .map((v) => {
          const val = v === undefined || v === null ? "" : String(v);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filenameBase}_${Date.now()}.csv"`
  );
  res.status(200).send(csv);
};

const sendStudentsPDF = (res, users, options = {}) => {
  const filenameBase = options.filenameBase || "students_export";
  const title = options.title || "Student Profiles";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filenameBase}_${Date.now()}.pdf"`
  );

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "left" });
  doc.moveDown(0.5);

  if (options.metaLines?.length) {
    doc.fontSize(10).font("Helvetica").text(options.metaLines.join("\n"));
    doc.moveDown(1);
  }

  users.forEach((u, idx) => {
    if (idx > 0) doc.addPage();

    doc.fontSize(12).font("Helvetica-Bold").text(`Student ${idx + 1}`);
    doc.moveDown(0.25);
    doc.fontSize(10).font("Helvetica");

    const lines = [
      `Name: ${u.name || ""}`,
      `Username: ${u.username || ""}`,
      `Email: ${u.email || ""}`,
      `Phone: ${u.phone || ""}`,
      `Institution: ${u.institution || ""}`,
      `Program: ${u.program || ""}`,
      `Course: ${u.course || ""}`,
      `Specialization: ${u.specialization || ""}`,
      `Year: ${u.year || ""}`,
      `DOB: ${formatDate(u.dob)}`,
      `Status: ${u.status || ""}`,
      `Role: ${u.role || ""}`,
      `Headline: ${u.headline || ""}`,
      `Location: ${u.location || ""}`,
      `Bio: ${u.bio || ""}`,
      `Website: ${u.website || ""}`,
      `LinkedIn: ${u.linkedin || ""}`,
      `Twitter: ${u.twitter || ""}`,
      `GitHub: ${u.github || ""}`,
      `Skills: ${Array.isArray(u.skills) ? u.skills.join(", ") : ""}`,
      `Experience: ${
        Array.isArray(u.experience) && u.experience.length
          ? JSON.stringify(u.experience)
          : ""
      }`,
      `Education: ${
        Array.isArray(u.education) && u.education.length
          ? JSON.stringify(u.education)
          : ""
      }`,
      `Private - Current Company: ${u.privateInfo?.currentCompany || ""}`,
      `Private - Total Experience: ${
        u.privateInfo?.totalExperience != null ? u.privateInfo.totalExperience : ""
      }`,
      `Submitted At: ${formatDateTime(u.createdAt)}`,
    ];

    doc.text(lines.join("\n"), { width: 500 });
  });

  doc.end();
};

exports.exportStudentsCSV = async (req, res) => {
  try {
    const query = buildStudentQuery(req);
    const users = await User.find(query).select("-password").lean();
    if (!users || users.length === 0) return sendCSVResponse(res, [], "students");
    const rows = users.map(flattenUserForCSV);
    return sendCSVResponse(res, rows, "students");
  } catch (error) {
    console.error("exportStudentsCSV error:", error);
    return res.status(500).json({ message: "Failed to export students CSV" });
  }
};

exports.exportStudentCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "Student not found" });
    return sendCSVResponse(res, [flattenUserForCSV(user)], `student_${id}`);
  } catch (error) {
    console.error("exportStudentCSV error:", error);
    return res.status(500).json({ message: "Failed to export student CSV" });
  }
};

exports.exportStudentsPDF = async (req, res) => {
  try {
    const query = buildStudentQuery(req);
    const users = await User.find(query).select("-password").lean();

    const metaLines = [];
    if (req.query.institution) metaLines.push(`Institution: ${req.query.institution}`);
    if (req.query.course) metaLines.push(`Course: ${req.query.course}`);
    if (req.query.year) metaLines.push(`Year: ${req.query.year}`);
    if (req.query.company) metaLines.push(`Company: ${req.query.company}`);
    if (req.query.status && req.query.status !== "all") metaLines.push(`Status: ${req.query.status}`);

    return sendStudentsPDF(res, users || [], {
      filenameBase: "students_export",
      title: "Registered Student Profiles (Consolidated)",
      metaLines,
    });
  } catch (error) {
    console.error("exportStudentsPDF error:", error);
    return res.status(500).json({ message: "Failed to export students PDF" });
  }
};

exports.exportStudentPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "Student not found" });

    return sendStudentsPDF(res, [user], {
      filenameBase: `student_${id}`,
      title: "Registered Student Profile (Individual)",
    });
  } catch (error) {
    console.error("exportStudentPDF error:", error);
    return res.status(500).json({ message: "Failed to export student PDF" });
  }
};

