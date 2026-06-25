export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Delete Your Account | Menuthere Go (Delivery Partner App)</title>
  <meta name="description" content="How to delete your Menuthere Go delivery-partner account, what data is removed, and the timeline.">
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
    .pill { display:inline-block; background:#fff7ed; color:#c2410c; font-size:0.8rem; font-weight:600; padding:4px 10px; border-radius:999px; margin-bottom:18px; }
    .steps { counter-reset: step; list-style: none; padding-left: 0; }
    .steps li { position: relative; padding-left: 40px; margin-bottom: 14px; }
    .steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 0; width: 26px; height: 26px; background: #ea580c; color: #fff; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/menuthere-logo-full-new.svg" alt="Menuthere" class="logo" height="40">
    <span class="pill">Menuthere Go · Delivery Partner App</span>
    <h1>Delete Your Account</h1>
    <p class="date">Last Updated: 25 June 2026</p>

    <p class="intro">
      You can delete your <strong>Menuthere Go</strong> delivery-partner account — operated by <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong> — at any time. This page explains how to do it, what is removed, and the timeline.
    </p>

    <section>
      <h2>Delete from the app</h2>
      <ol class="steps">
        <li>Open <strong>Menuthere Go</strong> and sign in.</li>
        <li>Go to <strong>Profile</strong>.</li>
        <li>Tap <strong>Delete account</strong> and confirm.</li>
      </ol>
      <p>Your account is deactivated immediately, and your data is permanently deleted after 30 days (see below).</p>
    </section>

    <section>
      <h2>Prefer email?</h2>
      <p>
        Write to <a href="mailto:support@menuthere.com">support@menuthere.com</a> from the phone number or email registered to your account and we'll process the deletion for you. We may ask a question or two to confirm it's really you.
      </p>
    </section>

    <section>
      <h2>What happens, and when</h2>
      <ul>
        <li><strong>Right away:</strong> your account is deactivated — you go offline and stop receiving order offers.</li>
        <li><strong>After 30 days:</strong> your account and data are permanently deleted. During this 30-day window you can change your mind.</li>
        <li><strong>Signing back in within 30 days cancels the deletion</strong> and fully restores your account.</li>
      </ul>
    </section>

    <section>
      <h2>What gets deleted</h2>
      <ul>
        <li>Your rider profile and contact details</li>
        <li>Identity &amp; verification documents (driving licence, ID, profile photo) and vehicle details</li>
        <li>Your links to partner restaurants and your availability</li>
        <li>Saved sign-in sessions and devices</li>
      </ul>
      <p class="note">A limited set of records may be retained where required for legal, accounting, safety or fraud-prevention obligations, as described in our Privacy Policy.</p>
    </section>

    <section>
      <h2>Questions?</h2>
      <p>
        Contact <a href="mailto:support@menuthere.com">support@menuthere.com</a>. See also our <a href="/go/privacy-policy">Menuthere Go Privacy Policy</a> and <a href="/go/terms-and-conditions">Terms &amp; Conditions</a>.
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
