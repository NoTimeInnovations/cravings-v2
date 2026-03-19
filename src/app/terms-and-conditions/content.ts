const pageStyle = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.7; padding: 40px 20px 80px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
    .date { color: #6b7280; margin-bottom: 32px; font-size: 0.9rem; }
    .intro { color: #374151; margin-bottom: 32px; }
    section { margin-bottom: 28px; }
    h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; color: #111; }
    p { color: #374151; margin-bottom: 12px; }
    ul { padding-left: 24px; margin-bottom: 12px; color: #374151; }
    li { margin-bottom: 8px; }
    strong { color: #111; }
    a { color: #ea580c; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .logo { display: block; margin-bottom: 24px; height: 40px; }
`;

export const termsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Terms &amp; Conditions | Menuthere Digital Menu</title>
  <meta name="description" content="Terms and conditions for using Menuthere Digital Menu services.">
  <style>${pageStyle}</style>
</head>
<body>
  <div class="container">
    <img src="/menuthere-logo-full-new.svg" alt="Menuthere" class="logo" height="40">
    <h1>Terms &amp; Conditions</h1>
    <p class="date">Last Updated: March 19, 2026</p>

    <p class="intro">
      Welcome to Menuthere, a product of <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong>. By accessing or using our digital menu platform ("Service"), you agree to the following Terms &amp; Conditions. Please read them carefully.
    </p>

    <section>
      <h2>1. About the Service</h2>
      <p>
        Menuthere provides an online platform where restaurants can create, edit, and manage digital menus accessible via QR codes. Optional features include menu customization, availability controls, offer displays, and table/WhatsApp ordering.
      </p>
    </section>

    <section>
      <h2>2. Eligibility</h2>
      <p>
        You must be a restaurant owner, authorized staff member, or individual legally allowed to enter into agreements on behalf of a business. Users must be at least 18 years of age.
      </p>
    </section>

    <section>
      <h2>3. Account Registration</h2>
      <p>
        You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and all activity under your account.
      </p>
      <p>
        Account verification may require phone number verification via SMS one-time password (OTP). By registering, you consent to receiving automated verification messages.
      </p>
    </section>

    <section>
      <h2>4. SMS &amp; Phone Verification</h2>
      <p>
        Menuthere uses Firebase Authentication (a Google service) for phone number verification. By using our Service:
      </p>
      <ul>
        <li>You consent to receiving automated SMS messages containing one-time passwords (OTP) for login and order verification purposes.</li>
        <li>Standard message and data rates from your mobile carrier may apply.</li>
        <li>Message frequency varies based on your usage of the Service.</li>
        <li>You may opt out of SMS verification by choosing not to use phone-based login.</li>
      </ul>
      <p>
        For SMS-related support, contact <a href="mailto:help@mail.menuthere.com">help@mail.menuthere.com</a>.
      </p>
    </section>

    <section>
      <h2>5. Subscription &amp; Billing</h2>
      <p>Menuthere operates on a subscription model.</p>
      <ul>
        <li>Fees must be paid upfront for each billing cycle.</li>
        <li>Plans automatically renew unless cancelled before the renewal date.</li>
        <li>Upgrades or downgrades may adjust the billing amount.</li>
        <li>All payments are processed securely through third-party providers such as Paddle.</li>
      </ul>
    </section>

    <section>
      <h2>6. Acceptable Use</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Upload unlawful, misleading, or copyrighted content without permission.</li>
        <li>Use the service for fraudulent activity.</li>
        <li>Interfere with platform security or functionality.</li>
        <li>Impersonate another business or individual.</li>
        <li>Use the SMS verification service for spam or unauthorized purposes.</li>
      </ul>
      <p>
        We reserve the right to remove content or suspend accounts that violate these policies.
      </p>
    </section>

    <section>
      <h2>7. Intellectual Property</h2>
      <p>
        All software, branding, and platform features belong to Menuthere. Restaurants retain ownership of their menu content, images, and business information.
      </p>
    </section>

    <section>
      <h2>8. Service Availability</h2>
      <p>
        We strive for uninterrupted service but do not guarantee 100% uptime. Maintenance, upgrades, or external issues may occasionally affect availability.
      </p>
    </section>

    <section>
      <h2>9. Limitation of Liability</h2>
      <p>Menuthere is not responsible for:</p>
      <ul>
        <li>Loss of revenue due to inaccurate menu content entered by the user</li>
        <li>Customer disputes between restaurants and diners</li>
        <li>Third-party payment issues</li>
        <li>SMS delivery failures caused by mobile carriers or network issues</li>
        <li>Business losses arising from misuse of the Service</li>
      </ul>
      <p>Liability is limited to the amount paid during the last billing cycle.</p>
    </section>

    <section>
      <h2>10. Privacy</h2>
      <p>
        Your use of the Service is also governed by our <a href="/privacy-policy">Privacy Policy</a>, which describes how we collect, use, and protect your personal information including phone numbers and SMS data.
      </p>
    </section>

    <section>
      <h2>11. Termination</h2>
      <p>
        You may cancel anytime. We may suspend or terminate accounts that violate policies, misuse the platform, or fail to pay subscription fees.
      </p>
    </section>

    <section>
      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of India, without regard to conflict-of-law principles.
      </p>
    </section>

    <section>
      <h2>13. Changes to Terms</h2>
      <p>
        We may update these Terms at any time. Continued use of the Service indicates acceptance.
      </p>
      <p>
        For questions, contact: <a href="mailto:help@mail.menuthere.com">help@mail.menuthere.com</a>
      </p>
    </section>
  </div>
</body>
</html>`;
