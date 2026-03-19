export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy Policy | Menuthere Digital Menu</title>
  <meta name="description" content="Privacy policy for Menuthere Digital Menu. Learn how we collect, use, and protect your data.">
  <style>
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
    .note { font-size: 0.85rem; color: #6b7280; font-style: italic; }
    .logo { display: block; margin-bottom: 24px; height: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/menuthere-logo-full-new.svg" alt="Menuthere" class="logo" height="40">
    <h1>Privacy Policy</h1>
    <p class="date">Last Updated: March 19, 2026</p>

    <p class="intro">
      Menuthere, operated by <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong> ("we", "our", "us"), is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights.
    </p>

    <section>
      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> Name, email, password, restaurant name, business details.</li>
        <li><strong>Phone Number:</strong> We collect your phone number for account verification and authentication via SMS one-time passwords (OTP).</li>
        <li><strong>Menu Content:</strong> Items, prices, images, offers, descriptions.</li>
        <li><strong>Usage Data:</strong> Device info, browser type, pages visited, actions taken.</li>
        <li><strong>Payment Data:</strong> Processed securely by third-party providers (e.g., Paddle). We do not store card details.</li>
      </ul>
    </section>

    <section>
      <h2>2. How We Use Your Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>Provide and improve our digital menu services</li>
        <li>Authenticate accounts and verify user identity via SMS OTP verification</li>
        <li>Send one-time passwords (OTP) to your phone number for login and order verification</li>
        <li>Communicate updates, support replies, or billing notices</li>
        <li>Generate QR menus and configuration data</li>
        <li>Prevent fraud and ensure platform security</li>
        <li>Comply with legal obligations</li>
      </ul>
    </section>

    <section>
      <h2>3. SMS Verification</h2>
      <p>
        We use Firebase Authentication, a service provided by Google, to verify your phone number via SMS one-time passwords (OTP). When you provide your phone number for verification:
      </p>
      <ul>
        <li>An SMS containing a verification code is sent to your phone number</li>
        <li>Your phone number is shared with Google/Firebase solely for the purpose of sending the verification SMS</li>
        <li>Standard SMS rates from your carrier may apply</li>
        <li>Your phone number is stored securely and used only for authentication and order-related communication</li>
      </ul>
      <p>
        By using our SMS verification service, you consent to receiving automated SMS messages for authentication purposes. Message frequency varies. You can opt out by not using phone-based login.
      </p>
      <p>
        Google's privacy policy applies to the Firebase Authentication service: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
      </p>
    </section>

    <section>
      <h2>4. Sharing of Personal Data</h2>
      <p>We ONLY share data with:</p>
      <ul>
        <li>Google/Firebase for phone number verification and authentication</li>
        <li>Payment processors (e.g., Paddle) for billing</li>
        <li>Hosting providers (for storing menu data)</li>
        <li>Analytics tools for improving performance</li>
      </ul>
      <p class="note">We do NOT sell personal information.</p>
    </section>

    <section>
      <h2>5. Data Security</h2>
      <p>
        We use encryption, secure authentication, and third-party compliant services to protect your data. Phone numbers are stored securely and transmitted over encrypted connections. However, no system is 100% secure.
      </p>
    </section>

    <section>
      <h2>6. Data Retention</h2>
      <p>
        We retain user data, including phone numbers, as long as the account is active or as required for legal, accounting, and operational purposes. You may request deletion of your data at any time.
      </p>
    </section>

    <section>
      <h2>7. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access your data</li>
        <li>Update or correct your data</li>
        <li>Request deletion of your account and associated data</li>
        <li>Request export of your data</li>
        <li>Opt out of marketing emails and SMS communications</li>
      </ul>
    </section>

    <section>
      <h2>8. Children's Privacy</h2>
      <p>
        Menuthere is not intended for individuals under 18. We do not knowingly collect data from children under 18.
      </p>
    </section>

    <section>
      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be transferred and processed outside your country through secure and compliant service providers, including Google/Firebase services.
      </p>
    </section>

    <section>
      <h2>10. Updates to Policy</h2>
      <p>
        We may update this policy when needed. Changes will appear on this page with an updated "Last Updated" date.
      </p>
      <p>
        Questions? Contact <a href="mailto:help@mail.menuthere.com">help@mail.menuthere.com</a>
      </p>
    </section>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
