import React from "react";

const ContactChild = () => {
  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "auto",
        lineHeight: "1.7",
      }}
    >
      <h1>Child Safety Standards</h1>
      <p>
        <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
      </p>

      <p>
        This Child Safety Standards statement applies to <strong>Alvas Connect</strong>
        {" "}(<strong>com.alvas.alumniportal</strong>) operated by{" "}
        <strong>Alvas EDC</strong>.
      </p>

      <h2>1. Zero Tolerance for CSAE</h2>
      <p>
        Alvas Connect and Alvas EDC maintain a strict zero-tolerance policy for
        child sexual abuse and exploitation (CSAE), including child sexual abuse
        material (CSAM), grooming, sexual extortion, trafficking, and any content
        or behavior that sexually exploits, endangers, or harms children.
      </p>

      <h2>2. Prohibited Content and Behavior</h2>
      <ul>
        <li>Any CSAM or sexually exploitative child content</li>
        <li>Sexualization or abuse of minors in text, images, videos, or links</li>
        <li>Grooming, coercion, solicitation, or inappropriate contact with minors</li>
        <li>Attempts to share, request, promote, or distribute abusive child content</li>
      </ul>

      <h2>3. Reporting and Enforcement</h2>
      <p>
        Users can report harmful or suspicious content through in-app reporting.
        We review reports and take immediate action, including content removal,
        account suspension or termination, and escalation to relevant law
        enforcement or child safety authorities where required.
      </p>

      <h2>4. Compliance Commitment</h2>
      <p>
        Alvas Connect complies with applicable child safety laws and regulations.
        We continuously improve safety controls, moderation, and response
        processes to protect children on our platform.
      </p>

      <h2>5. Child Safety Point of Contact</h2>
      <p>
        For child safety concerns, policy inquiries, or urgent escalation, please
        contact our child safety team:
      </p>
      <p>
        <strong>Email:</strong> website@aiet.org.in
        <br />
        <strong>Developer:</strong> Alvas EDC
        <br />
        <strong>App:</strong> Alvas Connect (com.alvas.alumniportal)
      </p>
    </div>
  );
};

export default ContactChild;
