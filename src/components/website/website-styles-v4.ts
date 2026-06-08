export const WEBSITE_STYLES_V4 = `
.wb4 *{box-sizing:border-box}
.wb4{--wb4-accent:#EA580C;--wb4-bg:#F3F2EF;--wb4-card:#fff;--wb4-ink:#0B0B0B;--wb4-ink-2:#3D3D3D;--wb4-ink-3:#9A9A9A;--wb4-line:#E5E4E1;background:var(--wb4-bg);color:var(--wb4-ink);font-family:var(--font-geist),"Geist","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;font-feature-settings:"ss01","cv11"}
.wb4 a{color:inherit;text-decoration:none}
.wb4 button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.wb4 img{display:block;max-width:100%}

.wb4-container{max-width:1280px;margin:0 auto;padding:0 32px}

.wb4-nav{position:sticky;top:16px;z-index:40;display:flex;justify-content:center;padding:16px 20px 0;pointer-events:none}
.wb4-nav-inner{pointer-events:auto;display:flex;align-items:center;gap:14px;padding:8px 8px 8px 18px;background:rgba(255,255,255,.94);color:var(--wb4-ink);-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(0,0,0,.06);border-radius:999px;box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 12px 40px rgba(0,0,0,.08);width:min(100%, 980px)}
.wb4-brand{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600;letter-spacing:-.01em;flex-shrink:0;color:var(--wb4-ink)}
.wb4-brand-mark{width:32px;height:32px;border-radius:50%;overflow:hidden;background:var(--wb4-accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:600;flex-shrink:0}
.wb4-brand-mark img{width:100%;height:100%;object-fit:cover}
.wb4-nav-divider{width:1px;height:20px;background:rgba(0,0,0,.1);flex-shrink:0}
.wb4-nav-links{display:flex;gap:4px;font-size:13.5px;color:rgba(0,0,0,.65);flex:1;justify-content:center}
.wb4-nav-links a{padding:8px 14px;border-radius:999px;transition:background .15s, color .15s}
.wb4-nav-links a:hover{color:var(--wb4-ink);background:rgba(0,0,0,.05)}
.wb4-nav-cta{display:flex;align-items:center;gap:8px;flex-shrink:0}
.wb4 .wb4-nav-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:var(--wb4-accent);color:#fff;font-size:13.5px;font-weight:500;transition:transform .15s, filter .15s,box-shadow .15s;box-shadow:0 4px 12px -4px rgba(0,0,0,.15)}
.wb4 .wb4-nav-btn:hover{transform:translateY(-1px);filter:brightness(1.06);color:#fff;box-shadow:0 8px 16px -6px rgba(0,0,0,.18)}

.wb4-section{padding:96px 0}
.wb4-section.wb4-tight{padding:48px 0}

.wb4-hero{padding:48px 0 96px}
.wb4-hero-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center}
.wb4-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:500;color:var(--wb4-accent);letter-spacing:.18em;text-transform:uppercase;margin-bottom:20px}
.wb4-eyebrow::before{content:"";display:inline-block;width:18px;height:1px;background:var(--wb4-accent)}
.wb4-hero h1{font-size:clamp(30px, 3.6vw, 52px);line-height:1.08;letter-spacing:-.02em;font-weight:600;margin:0;color:#0B0B0B}
.wb4-hero-sub{font-size:17px;line-height:1.55;color:#3D3D3D;margin:20px 0 28px;max-width:520px}
.wb4-cta-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:32px}
.wb4 .wb4-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:500;transition:all .2s ease;border:1px solid transparent}
.wb4 .wb4-btn-primary{background:var(--wb4-accent);color:#fff;box-shadow:0 6px 18px -6px rgba(0,0,0,.18)}
.wb4 .wb4-btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 22px -8px rgba(0,0,0,.22);color:#fff;filter:brightness(1.06)}
.wb4 .wb4-btn-secondary{background:var(--wb4-card);color:var(--wb4-ink);border-color:var(--wb4-line)}
.wb4 .wb4-btn-secondary:hover{background:rgba(0,0,0,.03);color:var(--wb4-ink);border-color:#C9C8C5}

.wb4-rating{display:flex;align-items:center;gap:14px;margin-top:8px}
.wb4-rating-laurels{display:flex;align-items:center;gap:12px}
.wb4-laurel{font-size:42px;color:var(--wb4-ink-3);opacity:.5;line-height:1}
.wb4-rating-num{font-size:32px;font-weight:600;color:var(--wb4-ink);line-height:1;letter-spacing:-.02em}
.wb4-rating-stars{color:var(--wb4-accent);font-size:14px;letter-spacing:2px;display:block;margin-top:2px}
.wb4-rating-text{font-size:13.5px;color:var(--wb4-ink-2)}

.wb4-hero-photo{position:relative;border-radius:28px;overflow:hidden;aspect-ratio:1/1;background:var(--wb4-line);box-shadow:0 24px 60px -24px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.04)}
.wb4-hero-photo img{width:100%;height:100%;object-fit:cover}
.wb4 .wb4-gallery-pill{position:absolute;left:16px;bottom:16px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:10px 16px;font-size:13px;font-weight:500;color:var(--wb4-ink);display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);transition:transform .2s}
.wb4 .wb4-gallery-pill:hover{transform:translateY(-2px);color:var(--wb4-ink)}
.wb4-hero-caption{position:absolute;left:16px;top:16px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;font-size:12px;font-weight:500;letter-spacing:.02em;padding:6px 12px;border-radius:999px}

.wb4-sec-head{margin-bottom:56px;max-width:780px}
.wb4-sec-head h2{font-size:clamp(30px, 3.8vw, 48px);line-height:1.08;font-weight:600;letter-spacing:-.02em;color:var(--wb4-ink);margin:0}
.wb4-sec-head .wb4-sub{font-size:16px;line-height:1.6;color:var(--wb4-ink-2);margin-top:16px;max-width:560px}

.wb4-grid{display:grid;gap:20px}
.wb4-grid-3{grid-template-columns:repeat(3, minmax(0,1fr))}
.wb4-grid-4{grid-template-columns:repeat(4, minmax(0,1fr))}
.wb4-grid-5{grid-template-columns:repeat(5, minmax(0,1fr))}

.wb4-card{background:var(--wb4-card);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:14px;min-height:0;border:1px solid rgba(0,0,0,.04);box-shadow:0 1px 2px rgba(0,0,0,.03);transition:transform .2s ease, box-shadow .2s ease;position:relative}
.wb4-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px -12px rgba(0,0,0,.12)}
.wb4-card h3{font-size:19px;line-height:1.28;font-weight:600;letter-spacing:-.01em;color:var(--wb4-ink);margin:0}
.wb4-card p{font-size:14.5px;line-height:1.55;color:var(--wb4-ink-2);margin:0}
.wb4-card-num{position:absolute;top:22px;right:24px;font-size:13px;font-weight:600;color:var(--wb4-accent);letter-spacing:.05em;font-variant-numeric:tabular-nums}

.wb4-quote-box{background:#FAF9F7;border-radius:14px;padding:16px 18px;font-size:14px;line-height:1.55;color:var(--wb4-ink-2);border-left:3px solid var(--wb4-accent);position:relative}
.wb4-quote-text{margin:0 0 10px;font-style:italic}
.wb4-quote-author{font-size:12.5px;color:var(--wb4-ink-3);font-weight:500;letter-spacing:.02em}

.wb4-photo-tile{display:flex;flex-direction:column;gap:10px;cursor:default}
.wb4-photo-img{aspect-ratio:1/1;border-radius:16px;overflow:hidden;background:var(--wb4-line);transition:transform .25s ease, box-shadow .25s ease}
.wb4-photo-tile:hover .wb4-photo-img{transform:translateY(-3px);box-shadow:0 16px 32px -16px rgba(0,0,0,.18)}
.wb4-photo-img img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
.wb4-photo-tile:hover .wb4-photo-img img{transform:scale(1.04)}
.wb4-photo-caption{font-size:13.5px;color:var(--wb4-ink-2);line-height:1.4;padding-left:4px}

.wb4-tip-icon{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:color-mix(in srgb, var(--wb4-accent) 12%, transparent);font-size:22px;line-height:1}

.wb4-menu-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
.wb4-menu-tab{padding:10px 16px;border-radius:999px;font-size:13px;color:#3D3D3D;background:#fff;border:1px solid #E5E4E1;transition:all .2s}
.wb4-menu-tab-active{background:#111;color:#fff;border-color:#111}
.wb4-menu-list{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:0 48px}
.wb4-menu-row{display:grid;grid-template-columns:88px 1fr auto;gap:18px;align-items:start;padding:24px 0;border-bottom:1px solid #E5E4E1}
.wb4-menu-thumb{width:88px;height:88px;border-radius:12px;overflow:hidden;background:#E5E4E1;flex-shrink:0}
.wb4-menu-thumb img{width:100%;height:100%;object-fit:cover}
.wb4-menu-body{min-width:0}
.wb4-menu-name{font-size:18px;line-height:1.25;font-weight:600;color:#0B0B0B;margin:0}
.wb4-menu-desc{font-size:13.5px;line-height:1.5;color:#5C5C5C;margin:6px 0 0;max-width:42ch}
.wb4-menu-tag{display:inline-block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#5C5C5C;padding:3px 8px;border:1px solid #E5E4E1;border-radius:999px;margin-top:10px}
.wb4-menu-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.wb4-menu-price{font-size:18px;font-weight:600;color:#0B0B0B;font-variant-numeric:tabular-nums}
.wb4 .wb4-menu-add{display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;transition:opacity .15s}
.wb4 .wb4-menu-add:hover{opacity:.85;color:#fff}
.wb4-menu-footer{display:flex;justify-content:space-between;align-items:center;margin-top:48px;padding-top:24px;border-top:1px solid #E5E4E1;flex-wrap:wrap;gap:16px}
.wb4-menu-note{color:#9A9A9A;font-size:13px;max-width:460px;line-height:1.5;margin:0}

.wb4-visit-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.wb4-visit-map{aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:var(--wb4-line)}
.wb4-visit-map img,.wb4-visit-map iframe{width:100%;height:100%;object-fit:cover;display:block;border:0}
.wb4-visit-info{display:flex;flex-direction:column;gap:32px}
.wb4-visit-block .wb4-eyebrow{margin-bottom:10px}
.wb4-visit-h{font-size:17px;line-height:1.45;color:#0B0B0B;margin:0;font-weight:500}
.wb4-visit-sub{font-size:14px;color:#5C5C5C;line-height:1.5;margin:8px 0 0}
.wb4-hours-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.wb4-hours-list li{display:flex;justify-content:space-between;gap:24px;font-size:14px;color:#5C5C5C;padding:6px 0;border-bottom:1px solid #F0EFEC}
.wb4-hours-list li:last-child{border-bottom:0}
.wb4-hours-list b{color:#0B0B0B;font-weight:500}
.wb4-visit-link{color:#0B0B0B;text-decoration:underline;text-decoration-color:#D1D1D1}
.wb4-visit-link:hover{text-decoration-color:#0B0B0B}

.wb4-foot{background:#F3F2EF;color:#0B0B0B;padding:64px 0 32px;border-top:1px solid #E5E4E1}
.wb4-foot-mark{font-size:20px;font-weight:600;letter-spacing:-.01em;line-height:1.2;margin-bottom:32px;color:var(--wb4-ink)}
.wb4-foot-grid{display:grid;grid-template-columns:repeat(3, minmax(0,1fr));gap:32px;padding-top:24px;border-top:1px solid #E5E4E1}
.wb4-foot-col{display:flex;flex-direction:column;gap:6px}
.wb4-foot-col h5{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9A9A9A;margin:0 0 12px;font-weight:500}
.wb4-foot-col a{font-size:14px;color:#0B0B0B;transition:opacity .15s}
.wb4-foot-col a:hover{opacity:.65}
.wb4-foot-col p{font-size:14px;color:#3D3D3D;margin:0 0 6px;line-height:1.55;white-space:pre-line}
.wb4-foot-sublabel{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#9A9A9A;margin-top:18px;font-weight:500}
.wb4-foot-sublist{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.wb4-foot-bot{margin-top:48px;font-size:13px;color:#9A9A9A}
.wb4-foot-legal{margin-top:6px;font-size:12px;color:#B5B5B5}

.wb4 .wb4-watermark{position:fixed;right:18px;bottom:18px;z-index:60;background:#fff;border-radius:999px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#0c0a09;box-shadow:0 6px 18px -6px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);transition:transform .15s, box-shadow .15s}
.wb4 .wb4-watermark:hover{transform:translateY(-1px);box-shadow:0 10px 22px -6px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.05);color:#0c0a09}

.wb4-rev-summary{display:flex;align-items:baseline;gap:18px;margin-bottom:40px;flex-wrap:wrap;padding-bottom:32px;border-bottom:1px solid var(--wb4-line)}
.wb4-rev-num{font-size:72px;font-weight:600;line-height:.95;letter-spacing:-.02em;color:var(--wb4-ink)}
.wb4-rev-stars{color:var(--wb4-accent);font-size:20px;letter-spacing:3px}
.wb4-rev-meta{font-size:12px;font-weight:500;color:var(--wb4-ink-3);letter-spacing:.14em;text-transform:uppercase}
.wb4-rev-card{background:var(--wb4-card);border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:14px;border:1px solid rgba(0,0,0,.04);transition:transform .2s ease, box-shadow .2s ease}
.wb4-rev-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px -12px rgba(0,0,0,.1)}
.wb4-rev-head{display:flex;align-items:center;gap:12px}
.wb4-rev-avatar{width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;overflow:hidden;flex-shrink:0}
.wb4-rev-avatar img{width:100%;height:100%;object-fit:cover}
.wb4-rev-author{font-size:14px;font-weight:500;color:#0B0B0B}
.wb4-rev-time{font-size:12px;color:#9A9A9A;margin-top:2px;letter-spacing:.04em;text-transform:uppercase}
.wb4-rev-stars-small{color:var(--wb4-accent);font-size:13px;letter-spacing:2px}
.wb4-rev-text{font-size:15px;line-height:1.55;color:#3D3D3D;margin:0;display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}

.wb4-hours-card{background:#fff;border-radius:18px;padding:32px;margin-bottom:24px}
.wb4-hours-head{display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap}
.wb4-hours-title{font-size:32px;font-weight:600;letter-spacing:-.01em;margin:0;line-height:1}
.wb4-status-badge{display:inline-flex;align-items:center;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:500}
.wb4-status-closed{background:#FFE4E4;color:#B91C1C}
.wb4-status-open{background:#DCFCE7;color:#15803D}
.wb4-hours-row{display:flex;justify-content:space-between;align-items:baseline;padding:14px 0;border-top:1px solid #F0EFEC}
.wb4-hours-row:first-child{border-top:0}
.wb4-hours-label{font-size:15px;font-weight:500;color:#0B0B0B}
.wb4-hours-value{font-size:15px;color:#5C5C5C}

.wb4-map{border-radius:18px;overflow:hidden;background:#E5E4E1}
.wb4-map iframe{display:block;width:100%;height:420px;border:0}

.wb4-footer{background:#111;color:#fff;padding:32px 0}
.wb4-footer-inner{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}
.wb4-footer-cta{display:flex;gap:12px;flex-wrap:wrap}
.wb4-footer .wb4-btn-primary{background:#fff;color:#111}
.wb4-footer .wb4-btn-primary:hover{opacity:.9}
.wb4-footer .wb4-btn-secondary{color:#fff;border-color:rgba(255,255,255,.25)}
.wb4-footer .wb4-btn-secondary:hover{background:rgba(255,255,255,.06)}
.wb4-footer-copy{font-size:13px;color:rgba(255,255,255,.5)}

@media (max-width: 1024px){
  .wb4-grid-4{grid-template-columns:repeat(2, minmax(0,1fr))}
  .wb4-grid-5{grid-template-columns:repeat(3, minmax(0,1fr))}
  .wb4-grid-3{grid-template-columns:repeat(2, minmax(0,1fr))}
}
@media (max-width: 1024px){
  .wb4-visit-grid{grid-template-columns:1fr 1fr;gap:32px}
  .wb4-foot-grid{grid-template-columns:repeat(2, minmax(0,1fr))}
}
@media (max-width: 720px){
  .wb4-container{padding:0 20px}
  .wb4-nav{padding:12px 16px 0}
  .wb4-nav-inner{padding:6px 6px 6px 12px;gap:8px;justify-content:space-between}
  .wb4-nav-links,.wb4-nav-divider{display:none}
  .wb4-brand{flex-shrink:1;min-width:0}
  .wb4-brand > :last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .wb4-brand{font-size:14px;gap:8px}
  .wb4-brand-mark{width:28px;height:28px}
  .wb4 .wb4-nav-btn{padding:8px 14px;font-size:12.5px}
  .wb4-section{padding:64px 0}
  .wb4-hero{padding:24px 0 56px}
  .wb4-hero-grid{grid-template-columns:1fr;gap:24px;text-align:center;justify-items:center}
  .wb4-hero-grid > div:first-child{display:flex;flex-direction:column;align-items:center}
  .wb4-hero-sub{margin-left:auto;margin-right:auto}
  .wb4-cta-row{justify-content:center}
  .wb4-rating{justify-content:center}
  .wb4-hero-photo{order:-1;width:100%}
  .wb4-grid-3,.wb4-grid-4,.wb4-grid-5{grid-template-columns:1fr}
  .wb4-sec-head{text-align:center;margin-left:auto;margin-right:auto}
  .wb4-sec-head h2{font-size:28px}
  .wb4-sec-head .wb4-sub{margin-left:auto;margin-right:auto}
  .wb4-hours-title{font-size:24px}
  .wb4-menu-list{grid-template-columns:1fr;gap:0}
  .wb4-menu-row{grid-template-columns:64px 1fr;padding:18px 0}
  .wb4-menu-thumb{width:64px;height:64px}
  .wb4-menu-right{grid-column:2;flex-direction:row;align-items:center;justify-content:space-between;gap:14px}
  .wb4-menu-footer{justify-content:center}
  .wb4-visit-grid{grid-template-columns:1fr;gap:24px;text-align:center}
  .wb4-visit-block{display:flex;flex-direction:column;align-items:center}
  .wb4-hours-list{width:100%;max-width:320px}
  .wb4-foot-grid{grid-template-columns:1fr;text-align:center}
  .wb4-foot-col{align-items:center}
}
`;
