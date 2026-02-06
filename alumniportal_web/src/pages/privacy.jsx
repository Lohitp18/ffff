import React from "react";

const PrivacyPolicy = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "auto", lineHeight: "1.7" }}>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>

      <p>
        Alvas Connect ("we", "our", "us") operates the Alvas Connect mobile
        application ("App"). This Privacy Policy explains how we collect, use,
        and protect your information when you use our app.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>a) Personal Information</h3>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number (if provided)</li>
        <li>User profile information</li>
      </ul>

      <h3>b) Usage Data</h3>
      <ul>
        <li>App usage activity</li>
        <li>Device and operating system information</li>
        <li>Log data for security and performance monitoring</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and manage user accounts</li>
        <li>To provide app features and services</li>
        <li>To improve performance and user experience</li>
        <li>To ensure platform security</li>
        <li>To communicate important updates</li>
      </ul>

      <h2>3. Data Storage and Security</h2>
      <p>
        Your data is securely stored on our backend servers. We use encryption
        and standard security practices to protect user information from
        unauthorized access or disclosure.
      </p>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell, rent, or trade your personal data. Data may be disclosed
        only if required by law or to protect the security and integrity of our
        systems.
      </p>

      <h2>5. Third-Party Services</h2>
      <p>
        The app may use trusted third-party services for backend hosting,
        analytics, or performance monitoring. These services comply with their
        own privacy policies.
      </p>

      <h2>6. User Rights</h2>
      <p>
        You have the right to access, update, or delete your personal data. You
        may request account deletion by contacting us.
      </p>

      <h2>7. Children’s Privacy</h2>
      <p>
        Alvas Connect is not intended for children under the age of 13. We do not
        knowingly collect personal data from children.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be
        reflected on this page with an updated effective date.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, contact us at:
      </p>
      <p>
        <strong>Email:</strong> your-official-email@example.com <br />
        <strong>Organization:</strong> Alvas Connect
      </p>
    </div>
  );
};

export default PrivacyPolicy;
