export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Delete Your Account | Menuthere Go</title>
  <meta name="description" content="Verify your phone number and delete your Menuthere Go delivery-partner account.">
  <meta name="robots" content="noindex">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.6; padding: 40px 20px 80px; }
    .container { max-width: 520px; margin: 0 auto; }
    .logo { display: block; margin-bottom: 20px; height: 36px; }
    .pill { display:inline-block; background:#fff7ed; color:#c2410c; font-size:0.78rem; font-weight:600; padding:4px 10px; border-radius:999px; margin-bottom:16px; }
    h1 { font-size: 1.7rem; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 1.15rem; font-weight: 700; margin: 4px 0 10px; }
    .intro { color: #4b5563; margin-bottom: 24px; }
    p { color: #374151; margin-bottom: 12px; }
    label.fld { display:block; font-size:0.85rem; font-weight:600; color:#374151; margin-bottom:6px; }
    .phone-row { display:flex; align-items:stretch; gap:8px; }
    .cc { display:flex; align-items:center; padding:0 12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:10px; font-weight:600; color:#374151; }
    input[type=tel] { flex:1; width:100%; font-size:1rem; padding:12px 14px; border:1px solid #d1d5db; border-radius:10px; outline:none; letter-spacing:0.5px; }
    input[type=tel]:focus { border-color:#ea580c; box-shadow:0 0 0 3px rgba(234,88,18,.15); }
    .btn { width:100%; margin-top:16px; font-size:1rem; font-weight:600; padding:13px 16px; border:none; border-radius:10px; background:#ea580c; color:#fff; cursor:pointer; }
    .btn:hover { background:#c2410c; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn.danger { background:#dc2626; }
    .btn.danger:hover { background:#b91c1c; }
    .link { background:none; border:none; color:#ea580c; font-weight:600; cursor:pointer; padding:10px 0 0; font-size:0.9rem; }
    ul { padding-left:22px; margin:8px 0 16px; color:#374151; }
    li { margin-bottom:6px; }
    .callout { background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:14px 16px; color:#7c2d12; font-size:0.92rem; margin:16px 0; }
    .chk { display:flex; gap:10px; align-items:flex-start; font-size:0.92rem; color:#374151; margin:6px 0 4px; cursor:pointer; }
    .chk input { margin-top:3px; width:18px; height:18px; accent-color:#dc2626; }
    .err { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:10px; padding:11px 14px; font-size:0.9rem; margin-bottom:16px; }
    .ok-icon { width:56px; height:56px; border-radius:999px; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:30px; margin-bottom:14px; }
    .foot { margin-top:32px; font-size:0.85rem; color:#6b7280; }
    .foot a { color:#ea580c; text-decoration:none; }
    [hidden] { display:none !important; }
  </style>
</head>
<body>
  <div class="container">
    <img src="/menuthere-logo-full-new.svg" alt="Menuthere" class="logo" height="36">
    <span class="pill">Menuthere Go · Delivery Partner App</span>
    <h1>Delete your account</h1>
    <p class="intro">Verify the phone number on your Menuthere Go account, then schedule it for deletion.</p>

    <div id="err" class="err" hidden></div>

    <!-- Step 1: phone -->
    <section id="step-phone">
      <label class="fld" for="phone">Your phone number</label>
      <div class="phone-row">
        <span class="cc">+91</span>
        <input id="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit number" autocomplete="tel-national">
      </div>
      <button id="send-btn" class="btn">Send verification code</button>
    </section>

    <!-- Step 2: otp -->
    <section id="step-otp" hidden>
      <p>Enter the 6-digit code we sent to <strong id="otp-phone"></strong> on WhatsApp.</p>
      <input id="code" type="tel" inputmode="numeric" maxlength="6" placeholder="6-digit code" autocomplete="one-time-code">
      <button id="verify-btn" class="btn">Verify</button>
      <button id="resend-btn" class="link">Resend code</button>
    </section>

    <!-- Step 3: confirm -->
    <section id="step-confirm" hidden>
      <h2>You're verified</h2>
      <p>Deleting your account will remove:</p>
      <ul>
        <li>Your rider profile and contact details</li>
        <li>Identity &amp; verification documents (licence, ID, photo) and vehicle details</li>
        <li>Your links to partner restaurants and your availability</li>
        <li>Saved sign-in sessions and devices</li>
      </ul>
      <div class="callout">
        Your account is <strong>deactivated immediately</strong> and your data is <strong>permanently deleted after 30 days</strong>. Sign in to the app again before then and your account is fully restored.
      </div>
      <label class="chk"><input type="checkbox" id="ack"> I understand my account will be permanently deleted after 30 days.</label>
      <button id="delete-btn" class="btn danger" disabled>Delete my account</button>
    </section>

    <!-- Step 4: done -->
    <section id="step-done" hidden>
      <div class="ok-icon">&#10003;</div>
      <h2>Account scheduled for deletion</h2>
      <p id="done-msg"></p>
      <p>Changed your mind? Just sign in to the Menuthere Go app before that date and your account is restored automatically.</p>
    </section>

    <p class="foot">Questions? <a href="mailto:support@menuthere.com">support@menuthere.com</a> &middot; <a href="/go/privacy-policy">Privacy Policy</a> &middot; <a href="/go/terms-and-conditions">Terms</a></p>
  </div>

  <script>
    var $ = function(id){ return document.getElementById(id); };
    var phone = '';
    function showErr(m){ var e = $('err'); e.textContent = m || ''; e.hidden = !m; if(m){ window.scrollTo(0,0); } }
    function step(s){ ['phone','otp','confirm','done'].forEach(function(id){ $('step-'+id).hidden = (id !== s); }); showErr(''); }
    async function post(url, body){
      var r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: body ? JSON.stringify(body) : undefined });
      var d = {};
      try { d = await r.json(); } catch(e){}
      if(!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
      return d;
    }
    $('send-btn').onclick = async function(){
      var p = $('phone').value.trim();
      if(p.replace(/[^0-9]/g,'').length < 10){ showErr('Enter your 10-digit phone number.'); return; }
      $('send-btn').disabled = true;
      try { var d = await post('/api/go/rider-deletion/request-otp', { phone: p }); phone = d.phone; $('otp-phone').textContent = phone; step('otp'); $('code').focus(); }
      catch(e){ showErr(e.message); }
      finally { $('send-btn').disabled = false; }
    };
    $('verify-btn').onclick = async function(){
      var c = $('code').value.trim();
      if(!/^[0-9]{6}$/.test(c)){ showErr('Enter the 6-digit code.'); return; }
      $('verify-btn').disabled = true;
      try { await post('/api/go/rider-deletion/verify-otp', { phone: phone, code: c }); step('confirm'); }
      catch(e){ showErr(e.message); }
      finally { $('verify-btn').disabled = false; }
    };
    $('resend-btn').onclick = async function(){
      $('resend-btn').disabled = true;
      try { await post('/api/go/rider-deletion/request-otp', { phone: phone }); showErr(''); }
      catch(e){ showErr(e.message); }
      finally { setTimeout(function(){ $('resend-btn').disabled = false; }, 4000); }
    };
    $('ack').onchange = function(){ $('delete-btn').disabled = !$('ack').checked; };
    $('delete-btn').onclick = async function(){
      $('delete-btn').disabled = true;
      try {
        var d = await post('/api/go/rider-deletion/delete');
        var when = 'in 30 days';
        if(d.purgeAfter){ var dt = new Date(d.purgeAfter); if(!isNaN(dt.getTime())){ when = 'on ' + dt.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }); } }
        $('done-msg').textContent = 'Your account is deactivated now and will be permanently deleted ' + when + '.';
        step('done');
      } catch(e){ showErr(e.message); $('delete-btn').disabled = false; }
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // interactive page — don't cache hard
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
