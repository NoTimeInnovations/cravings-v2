export const WEBSITE_STYLES = `
.wb *{box-sizing:border-box}
.wb{background:var(--wb-bg);color:var(--wb-ink);font-family:var(--wb-sans);-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
.wb a{color:inherit;text-decoration:none}
.wb button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.wb img{display:block;max-width:100%}
.wb ::selection{background:var(--wb-accent);color:var(--wb-bg)}

.wb-container{max-width:1440px;margin:0 auto;padding:0 calc(48px * var(--wb-space, 1))}
.wb-display{font-family:var(--wb-display);font-weight:400;letter-spacing:-.015em;line-height:.95}
.wb-eyebrow{font-family:var(--wb-mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--wb-ink-2)}
.wb-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--wb-line);border-radius:999px;font-size:12px;color:var(--wb-ink-2)}

.wb-nav{position:sticky;top:16px;z-index:40;display:flex;justify-content:center;padding:0 20px;pointer-events:none}
.wb-nav-inner{pointer-events:auto;display:flex;align-items:center;gap:14px;padding:8px 8px 8px 18px;
  background:rgba(255,255,255,.92);color:#1a1714;
  -webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);
  border:1px solid rgba(0,0,0,.06);border-radius:999px;
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 12px 40px rgba(0,0,0,.10);
  width:min(100%, 980px)}
.wb-logo{display:flex;align-items:center;gap:10px;font-family:var(--wb-display);font-size:22px;letter-spacing:-.01em;flex-shrink:0;color:#1a1714}
.wb-logo-mark{width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--wb-accent);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-family:var(--wb-display);font-size:16px;flex-shrink:0}
.wb-logo-mark img{width:100%;height:100%;object-fit:cover}
.wb-nav-divider{width:1px;height:20px;background:rgba(0,0,0,.1);flex-shrink:0}
.wb-nav-links{display:flex;gap:4px;font-size:13.5px;color:rgba(26,23,20,.65);flex:1;justify-content:center}
.wb-nav-links a{padding:8px 14px;border-radius:999px;transition:background .2s, color .2s}
.wb-nav-links a:hover{color:#1a1714;background:rgba(0,0,0,.05)}
.wb-nav-cta{display:flex;align-items:center;gap:8px;flex-shrink:0}

.wb .wb-btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;font-size:13px;font-weight:500;letter-spacing:.01em;transition:transform .2s ease}
.wb .wb-btn-primary{background:var(--wb-accent);color:#FFFFFF}
.wb .wb-btn-primary:hover{transform:translateY(-1px);color:#FFFFFF}
.wb .wb-btn-ghost{border:1px solid var(--wb-line);color:var(--wb-ink)}
.wb .wb-btn-ghost:hover{border-color:var(--wb-ink);color:var(--wb-ink)}
.wb-btn .wb-arrow{transition:transform .2s}
.wb-btn:hover .wb-arrow{transform:translate(2px,-2px)}

.wb-hero{position:relative;overflow:hidden}
.wb-marq{display:flex;gap:48px;white-space:nowrap;border-top:1px solid var(--wb-line);border-bottom:1px solid var(--wb-line);padding:14px 0;font-family:var(--wb-display);font-size:22px;color:var(--wb-ink-2)}
.wb-marq em{color:var(--wb-accent);font-style:italic}
@keyframes wb-marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.wb-marq-track{display:flex;gap:48px;animation:wb-marq 38s linear infinite;min-width:200%}
.wb-marq-group{display:inline-flex;align-items:center;gap:48px}

.wb-hero-fb{padding:80px 0 56px}
.wb-hero-fb h1{font-size:clamp(64px, 11vw, 168px);margin:0;letter-spacing:-.02em}
.wb-hero-fb h1 .wb-it{font-style:italic;color:var(--wb-accent)}
.wb-hero-fb .wb-sub{max-width:640px;margin:24px 0 0;color:var(--wb-ink-2);font-size:17px;line-height:1.55}
.wb-hero-fb .wb-row{display:flex;gap:14px;margin-top:36px;flex-wrap:wrap;align-items:center}
.wb-hero-fb .wb-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:64px;padding-top:24px;border-top:1px solid var(--wb-line)}
.wb-hero-fb .wb-meta .wb-k{font-family:var(--wb-mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--wb-ink-3)}
.wb-hero-fb .wb-meta .wb-v{font-family:var(--wb-display);font-size:22px;margin-top:6px}

.wb-collage{display:grid;grid-template-columns:1.2fr .8fr 1fr;grid-template-rows:200px 240px;gap:14px;margin-top:48px}
.wb-collage > *{border-radius:14px;overflow:hidden;position:relative;background:#1a1714}
.wb-c-img{width:100%;height:100%;object-fit:cover;filter:saturate(1.05)}
.wb-img-tag{position:absolute;left:14px;bottom:14px;padding:5px 10px;background:rgba(14,15,12,.7);backdrop-filter:blur(8px);border-radius:999px;font-size:11px;font-family:var(--wb-mono);letter-spacing:.08em;color:#fff}
.wb-c1{grid-row:1/3}
.wb-c2{grid-column:2;grid-row:1}
.wb-c3{grid-column:2;grid-row:2}
.wb-c4{grid-column:3;grid-row:1/3}
.wb-ph{background:linear-gradient(135deg, #2a201a, #110d09)}

.wb-section{padding:120px 0;border-top:1px solid var(--wb-line)}
.wb-section.wb-no-border{border-top:0}
.wb-sec-head{display:flex;align-items:end;justify-content:space-between;gap:48px;margin-bottom:64px;flex-wrap:wrap}
.wb-sec-head h2{font-size:clamp(44px, 5.4vw, 88px);margin:14px 0 0;max-width:720px}
.wb-sec-head h2 .wb-it{font-style:italic;color:var(--wb-accent)}

.wb-about-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
.wb-about-img{aspect-ratio:5/6;border-radius:18px;overflow:hidden;position:relative;background:#1a1714}
.wb-about-img img{width:100%;height:100%;object-fit:cover}
.wb-about-copy{padding-top:24px}
.wb-about-copy p{font-size:18px;line-height:1.6;color:var(--wb-ink-2);margin:0 0 20px}
.wb-about-copy p:first-child{font-family:var(--wb-display);font-size:32px;line-height:1.2;color:var(--wb-ink);max-width:560px}

.wb-menu-tabs{display:flex;gap:8px;flex-wrap:wrap}
.wb-menu-tab{padding:10px 16px;border:1px solid var(--wb-line);border-radius:999px;font-size:13px;color:var(--wb-ink-2);transition:all .2s}
.wb-menu-tab.wb-active{background:var(--wb-ink);color:var(--wb-bg);border-color:var(--wb-ink)}
.wb-menu-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:48px 64px}
.wb-menu-row{display:grid;grid-template-columns:96px 1fr auto;gap:20px;align-items:start;padding:24px 0;border-bottom:1px dashed var(--wb-line);transition:padding .2s}
.wb-menu-row:hover{padding-left:8px}
.wb-menu-thumb{width:96px;height:96px;border-radius:12px;overflow:hidden;background:#1b1c19;flex-shrink:0}
.wb-menu-thumb img{width:100%;height:100%;object-fit:cover}
.wb-menu-name{font-family:var(--wb-display);font-size:26px;line-height:1.05;margin:0;color:var(--wb-ink)}
.wb-menu-desc{font-size:13.5px;line-height:1.5;color:var(--wb-ink-2);margin:6px 0 0;max-width:42ch}
.wb-menu-tags{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.wb-menu-tag{font-family:var(--wb-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--wb-ink-3);padding:3px 8px;border:1px solid var(--wb-line);border-radius:999px}
.wb-menu-price{font-family:var(--wb-display);font-size:24px;color:var(--wb-ink);font-variant-numeric:tabular-nums}
.wb-menu-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.wb .wb-menu-add{display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border-radius:999px;background:var(--wb-accent);color:#FFFFFF;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:transform .15s ease}
.wb .wb-menu-add:hover{transform:translateY(-1px);color:#FFFFFF}

.wb-menu-footer{display:flex;justify-content:space-between;align-items:center;margin-top:64px;padding-top:32px;border-top:1px solid var(--wb-line);flex-wrap:wrap;gap:24px}
.wb-menu-footer .wb-note{color:var(--wb-ink-3);font-size:13px;max-width:460px;line-height:1.5}

.wb-visit-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:start}
.wb-visit-map{aspect-ratio:5/4;border-radius:18px;overflow:hidden;position:relative;background:#1a1714}
.wb-visit-map img{width:100%;height:100%;object-fit:cover}
.wb-visit-info{display:grid;grid-template-columns:1fr 1fr;gap:36px 32px}
.wb-visit-block .wb-eyebrow{display:block;margin-bottom:10px}
.wb-visit-h{font-family:var(--wb-display);font-size:24px;line-height:1.15;margin:0;color:var(--wb-ink)}
.wb-visit-sub{font-size:14px;line-height:1.55;color:var(--wb-ink-2);margin:8px 0 0}
.wb-hours{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wb-hours li{display:flex;justify-content:space-between;font-size:14px;padding:8px 0;border-bottom:1px dashed var(--wb-line)}
.wb-hours li span{color:var(--wb-ink-2)}
.wb-hours li b{font-weight:500;color:var(--wb-ink);font-variant-numeric:tabular-nums}

.wb-footer{padding:80px 0 48px;border-top:1px solid var(--wb-line)}
.wb-foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr 1fr;gap:48px}
.wb-foot-col h5{font-family:var(--wb-mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--wb-ink-3);margin:0 0 18px}
.wb-foot-col a, .wb-foot-col p{display:block;color:var(--wb-ink-2);font-size:14px;line-height:1.7;margin:0}
.wb-foot-col a:hover{color:var(--wb-accent)}
.wb-foot-sublabel{display:block;color:var(--wb-ink);font-size:14px;font-weight:600;margin-top:14px}
.wb-foot-sublist{margin:6px 0 0;padding-left:14px;border-left:1px solid var(--wb-line);display:flex;flex-direction:column;gap:2px}
.wb-foot-sublist a{font-size:13.5px;color:var(--wb-ink-2)}
.wb-foot-bot{display:flex;justify-content:space-between;margin-top:64px;padding-top:24px;border-top:1px solid var(--wb-line);font-size:12px;color:var(--wb-ink-3);font-family:var(--wb-mono);letter-spacing:.06em;flex-wrap:wrap;gap:16px}
.wb-foot-mark{font-family:var(--wb-display);font-size:120px;line-height:.85;letter-spacing:-.04em;margin:48px 0 24px;color:var(--wb-ink);word-break:break-word}
.wb-foot-mark .wb-it{font-style:italic;color:var(--wb-accent)}

@media (max-width: 1024px){
  .wb-container{padding:0 32px}
  .wb-about-grid{grid-template-columns:1fr;gap:48px}
  .wb-menu-grid{grid-template-columns:1fr;gap:0}
  .wb-foot-grid{grid-template-columns:1fr 1fr}
  .wb-collage{grid-template-columns:1fr 1fr;grid-template-rows:200px 200px 200px}
  .wb-c1{grid-row:1;grid-column:1/3}.wb-c2{grid-row:2;grid-column:1}.wb-c3{grid-row:2;grid-column:2}.wb-c4{grid-row:3;grid-column:1/3}
  .wb-visit-grid{grid-template-columns:1fr;gap:32px}
  .wb-visit-info{grid-template-columns:1fr 1fr;gap:28px}
  .wb-section{padding:80px 0}
  .wb-sec-head{margin-bottom:40px;gap:24px}
}

@media (max-width: 720px){
  .wb-container{padding:0 20px}
  .wb-nav{top:10px;padding:0 12px}
  .wb-nav-inner{padding:6px 6px 6px 14px;gap:8px}
  .wb-nav-divider{display:none}
  .wb-nav-links{display:none}
  .wb-logo{font-size:20px}
  .wb-logo-mark{width:24px;height:24px;font-size:13px}
  .wb-btn{padding:10px 14px;font-size:12.5px}
  .wb-hero-fb{padding:48px 0 32px}
  .wb-hero-fb h1{font-size:clamp(44px, 13vw, 72px);line-height:.98}
  .wb-hero-fb .wb-sub{font-size:15px;margin-top:18px}
  .wb-hero-fb .wb-row{margin-top:24px;gap:10px}
  .wb-hero-fb .wb-meta{grid-template-columns:1fr;gap:18px;margin-top:40px;padding-top:18px}
  .wb-hero-fb .wb-meta .wb-v{font-size:18px}
  .wb-marq{font-size:16px;padding:12px 0}
  .wb-collage{grid-template-columns:1fr;grid-template-rows:repeat(4, 180px);gap:10px;margin-top:32px}
  .wb-c1,.wb-c2,.wb-c3,.wb-c4{grid-row:auto;grid-column:1}
  .wb-section{padding:64px 0}
  .wb-sec-head{flex-direction:column;align-items:flex-start;gap:18px;margin-bottom:32px}
  .wb-sec-head h2{font-size:clamp(36px, 9vw, 56px)}
  .wb-about-copy{padding-top:0}
  .wb-about-copy p:first-child{font-size:24px}
  .wb-about-copy p{font-size:15.5px;margin-bottom:16px}
  .wb-about-img{aspect-ratio:4/5}
  .wb-menu-grid{gap:0}
  .wb-menu-tabs{gap:6px;width:100%;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch}
  .wb-menu-tab{padding:8px 12px;font-size:12px;flex-shrink:0}
  .wb-menu-row{grid-template-columns:64px 1fr;gap:14px;padding:18px 0}
  .wb-menu-thumb{width:64px;height:64px}
  .wb-menu-name{font-size:20px}
  .wb-menu-desc{font-size:13px}
  .wb-menu-price{font-size:18px}
  .wb-menu-right{grid-column:2;flex-direction:row;align-items:center;justify-content:space-between;margin-top:6px;gap:14px}
  .wb-menu-footer{flex-direction:column;align-items:flex-start;margin-top:32px;padding-top:24px;gap:18px}
  .wb-visit-info{grid-template-columns:1fr;gap:28px}
  .wb-visit-h{font-size:20px}
  .wb-visit-map{aspect-ratio:4/3}
  .wb-footer{padding:56px 0 32px}
  .wb-foot-grid{grid-template-columns:1fr;gap:32px}
  .wb-foot-mark{font-size:64px;margin:24px 0 18px}
  .wb-foot-bot{flex-direction:column;align-items:flex-start;margin-top:40px;font-size:11px}
}
`;
