import React, { useState, useEffect } from "react";

const SAMPLE_CALLS = [
  {
    id: 1,
    created_at: "2026-06-18T14:14:00.000Z",
    caller_name: "Margaret Reyes",
    image_url: null,
    report_json: {
      lead: { name:"Margaret Reyes", descriptor:"Homeowner · New customer · El Dorado Hills", phone:"(916) 555-0148", preferred_contact:"Call or text", email:"mreyes@gmail.com", address_line1:"1142 Oak Ridge Dr", address_line2:"El Dorado Hills, CA 95762", how_found:'Google — "AC repair near me"' },
      priority: { tier:"Urgent", reason:"Heat advisory · elderly resident · getting worse" },
      callback: { time:"4–6 PM", period:"Afternoon", days:["Tue"], note:"after 4 is best, I'm home from work by then" },
      recap: "Margaret called at 2:14 PM; Voice AI answered. She described it plainly — <q>my air conditioner's running but it's just blowing warm air</q> — and added <q>it started this morning and now the house is up to 84 degrees.</q> She raised the urgency herself: <q>my mom is elderly, and this heat is really hard on her.</q>",
      tone_read: "Anxious and direct — high-intent, time-sensitive. Named the urgency herself before being asked.",
      dispatch_note: "Elderly resident in active heat — motivated caller, not price-shopping. Window opens at 4 PM.",
      problem: { title:"A/C Not Cooling", detail:"Running but blowing warm air · 84°F indoor · started this morning", quote:"it's just blowing warm air" }
    }
  }
];

const DAY_KEYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_LABELS = ["M","T","W","T","F","S","S"];
const TIERS = ["Emergency","Urgent","Standard","Quote"];

const TIER_COLORS = {
  Emergency: { border:"#dc5b4e", bg:"rgba(220,91,78,.12)", dot:"#dc5b4e", text:"#f0a59b" },
  Urgent:    { border:"#e2884a", bg:"rgba(226,136,74,.12)", dot:"#e2884a", text:"#f3c59c" },
  Standard:  { border:"#378add", bg:"rgba(55,138,221,.08)", dot:"#378add", text:"#82a0ba" },
  Quote:     { border:"#4a7a65", bg:"rgba(74,122,101,.1)",  dot:"#4a7a65", text:"#7fad95" }
};

const LIST_COLS = "id,created_at,caller_name,client_id,report_json,archived_at,deleted_at";

const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8";

const TIER_DOT_COLORS = { Emergency:"#dc5b4e", Urgent:"#e2884a", Standard:"#378add", Quote:"#4a7a65" };

function isDayActive(dayKey, days) {
  if (!days || days.length === 0) return false;
  const lk = dayKey.toLowerCase();
  return days.some(d => {
    const ld = d.toLowerCase();
    if (ld === "today" || ld === "anytime") return true;
    if (ld === "weekdays" && ["mon","tue","wed","thu","fri"].includes(lk)) return true;
    if (ld === "weekend" && ["sat","sun"].includes(lk)) return true;
    return ld === lk || ld.startsWith(lk) || lk.startsWith(ld);
  });
}

// The priority column exists to justify the tier — why THIS call is Urgent
// rather than Standard. When the generator fills priority.reason with a
// restatement of the problem instead, the row prints the same thing twice
// (the problem already has its own column), and the one field that could
// explain the triage decision explains nothing. These two helpers keep only
// the parts that actually justify the tier.

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","of","for","with",
  "into","from","over","under","by","is","are","was","were","be","been",
  "has","have","had","its","their","this","that","not","no","out","up"
]);

function meaningfulWords(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// A segment "restates the problem" when most of its substance already appears
// in the problem title/detail. 0.6 rather than 1.0 because generators reword
// slightly ("blowing warm air" vs "warm air blowing") — an exact-match test
// would catch almost nothing.
function restatesProblem(segment, problemWords) {
  const words = meaningfulWords(segment);
  if (!words.length) return true;
  const overlap = words.filter(w => problemWords.has(w)).length;
  return overlap / words.length >= 0.6;
}

// Keep only the segments that say something the problem column doesn't.
function distinctReason(reason, problem) {
  if (!reason) return "";
  const problemWords = new Set(meaningfulWords(
    `${problem?.title || ""} ${problem?.detail || ""}`));
  if (!problemWords.size) return reason;
  return reason.split("·").map(s => s.trim()).filter(Boolean)
    .filter(seg => !restatesProblem(seg, problemWords)).join(" · ");
}

// When the reason was pure restatement there is nothing left to show, but an
// empty box under the tier pill reads as missing data. The dispatch note on
// the same report is written to explain urgency ("Elderly resident in active
// heat — motivated caller"), so its opening clause is a real justification
// from the same call rather than invented filler. Returns "" if that note is
// also just the problem again, since showing nothing beats showing a dupe.
function fallbackJustification(d) {
  const note = d?.dispatch_note || d?.tone_read || "";
  const clause = note.split(/[—–.;]/)[0].trim();
  if (!clause) return "";
  const problemWords = new Set(meaningfulWords(
    `${d?.problem?.title || ""} ${d?.problem?.detail || ""}`));
  if (problemWords.size && restatesProblem(clause, problemWords)) return "";
  return clause;
}

// The generator writes "Not provided" (and friends) rather than leaving a field
// out, so an absent value has to be recognised as text, not as null.
const NOT_PROVIDED = /^(not provided|not specified|n\/?a|none|unknown|null)$/i;
function cleanField(v) {
  const t = (v||"").trim();
  return (!t || NOT_PROVIDED.test(t)) ? "" : t;
}

// "Call or text" / "Text" / "phone" -> "prefers call or text" / "prefers text".
// Returns "" when the caller never said, so the mid-dot can be dropped with it.
function prefersPhrase(pref) {
  const v = (pref||"").toLowerCase();
  const call = /call|phone|voice/.test(v), text = /text|sms|message/.test(v);
  if (call && text) return "prefers call or text";
  if (text) return "prefers text";
  if (call) return "prefers call";
  return "";
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "128,128,128";
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}

function fmtDateGroup(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate()-1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"});
}

function RecapHtml({ html }) {
  const parts = [];
  const re = /<q>(.*?)<\/q>/g;
  let m, last = 0;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) parts.push({ type:"text", val: html.slice(last, m.index) });
    parts.push({ type:"q", val: m[1] });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ type:"text", val: html.slice(last) });
  return (
    <p className="rpt-recap" style={{lineHeight:1.65,color:"#aebfcc",margin:0}}>
      {parts.map((p,i) => p.type === "q"
        ? <strong key={i} style={{color:"#eef3f7",fontWeight:700}}>{p.val}</strong>
        : <span key={i}>{p.val}</span>
      )}
    </p>
  );
}

// Tabler Icons (MIT) — the 11 glyphs this report uses, inlined as raw path data.
// The webfont package costs ~490KB over the wire (plus 127MB in node_modules) for
// the same 11 icons; this is ~2KB with no request and no third-party origin.
// Source: @tabler/icons v3, outline set, drawn on a 24x24 grid.
const ICON_PATHS = {
  "alert-circle":     ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0","M12 8v4","M12 16h.01"],
  "antenna":          ["M20 4v8","M16 4.5v7","M12 5v16","M8 5.5v5","M4 6v4","M20 8h-16"],
  "arrow-right":      ["M5 12l14 0","M13 18l6 -6","M13 6l6 6"],
  "at":               ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0","M16 12v1.5a2.5 2.5 0 0 0 5 0v-1.5a9 9 0 1 0 -5.5 8.28"],
  "clock":            ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0","M12 7v5l3 3"],
  "device-mobile":    ["M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14","M11 4h2","M12 17v.01"],
  "eye":              ["M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0","M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"],
  "file-description": ["M14 3v4a1 1 0 0 0 1 1h4","M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2","M9 17h6","M9 13h6"],
  "map-pin":          ["M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0","M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0"],
  "message-dots":     ["M12 11v.01","M8 11v.01","M16 11v.01","M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3l12 0"],
  "tool":             ["M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"]
};

// Sized in em and stroked with currentColor, so it keeps inheriting size from the
// font-size on its class or parent — exactly how the <i> font icons behaved.
function Icon({ name, className, style }) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg className={`lr-ico${className?` ${className}`:""}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true" focusable="false">
      {paths.map((d,i) => <path key={i} d={d}/>)}
    </svg>
  );
}

// Brand lockup ported from the marketing site's <header class="head"> in
// leadrescue-pages/index.html — the current version (founding-client-setup.html
// carries an older 100x116 copy with no glow and no tip dot).
// The blurred duplicate paths ARE the glow: iOS Safari ignores CSS filter on
// SVG children, so the blur is an SVG feGaussianBlur and only opacity animates.
// Each glow sits directly under its own path — the shield's fill would hide
// the wave's otherwise.
function BrandLockup({ uid, w=30, h=35 }) {
  const blur = `lr-logo-blur-${uid}`;            // unique per instance: both navs mount at once
  const SHIELD = "M60 8 L104 24 V64 C104 96 86 120 60 132 C34 120 16 96 16 64 V24 Z";
  const WAVE = "M26 70 H44 L51 70 L57 52 L66 88 L73 62 L78 70 H94";
  return (
    <div className="lr-brand">
      <svg className="lr-brand-logo" width={w} height={h} viewBox="0 0 120 140" fill="none" aria-hidden="true">
        <defs>
          <filter id={blur} x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur stdDeviation="4"/>
          </filter>
        </defs>
        <path className="bl-glow" d={SHIELD} fill="none" stroke="#5aa3e8" strokeWidth="5" strokeLinejoin="round" filter={`url(#${blur})`}/>
        <path d={SHIELD} fill="#10161f" stroke="#378add" strokeWidth="2.5" strokeLinejoin="round"/>
        <path className="bl-glow" d={WAVE} fill="none" stroke="#e6b074" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${blur})`}/>
        <circle className="bl-glow" cx="94" cy="70" r="5" fill="#e6b074" filter={`url(#${blur})`}/>
        <path d={WAVE} fill="none" stroke="#c89456" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="94" cy="70" r="3.5" fill="#dcab6e"/>
      </svg>
      <div>
        <div className="lr-wordmark lr-serif">Lead Rescue</div>
        <div className="lr-brand-sub lr-mono">Never miss another call</div>
      </div>
    </div>
  );
}

// Same colourway as BrandLockup above (blue shield, amber waveform, amber tip)
// so the two marks read as one brand on screen. Geometry stays on this 46x46
// grid — only the palette is aligned; no glow, the report is a static document.
function ShieldLogo({ size=38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <path d="M23 4 L39.5 10 L39.5 22.5 C39.5 31.5 32 38.5 23 42 C14 38.5 6.5 31.5 6.5 22.5 L6.5 10 Z"
        stroke="#378add" strokeWidth="1.7" fill="#10161f" strokeLinejoin="round"/>
      <path d="M11 24 H18 L20 24 L21.6 16.5 L24 31.5 L26.4 21 L28 24 H35"
        stroke="#c89456" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="35" cy="24" r="1.6" fill="#dcab6e"/>
    </svg>
  );
}

// Fallback blueprint illustration when no AI image available
function FallbackIllustration() {
  return (
    <svg width="130" height="110" viewBox="0 0 130 110">
      <defs>
        <pattern id="fsg" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1a3a5c" strokeWidth="0.35"/>
        </pattern>
        <pattern id="fmg" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e4468" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="130" height="110" fill="#071020"/>
      <rect width="130" height="110" fill="url(#fsg)"/>
      <rect width="130" height="110" fill="url(#fmg)"/>
      <rect x="20" y="20" width="90" height="70" rx="3" fill="none" stroke="#ffffff" strokeWidth="1.4"/>
      <line x1="20" y1="38" x2="110" y2="38" stroke="#ffffff" strokeWidth="0.7" opacity=".4"/>
      <line x1="65" y1="38" x2="65" y2="90" stroke="#ffffff" strokeWidth="0.7" opacity=".4"/>
      <circle cx="65" cy="59" r="16" fill="none" stroke="#ffffff" strokeWidth="1"/>
      <path d="M65 43 v16 M65 63 v3" stroke="#e2884a" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="65" cy="59" r="16" fill="none" stroke="#e2884a" strokeWidth="0.8" strokeDasharray="4,3" opacity=".5"/>
      <text x="65" y="106" fontFamily="monospace" fontSize="5" fill="#4a7a9b" textAnchor="middle">GENERATING BLUEPRINT...</text>
    </svg>
  );
}

// Problem illustration — AI image if available, fallback SVG if not
function ProblemIllustration({ imageUrl }) {
  if (imageUrl) {
    return (
      <div style={{
        width:"100%",
        borderRadius:3,
        overflow:"hidden",
        border:"1px solid #1a3a5c",
        background:"#071020"
      }}>
        <img
          src={imageUrl}
          alt="AI generated blueprint illustration"
          style={{
            width:"100%",
            height:"auto",
            display:"block",
            maxHeight:160,
            objectFit:"contain"
          }}
        />
      </div>
    );
  }
  return <FallbackIllustration/>;
}

const NOW = new Date();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_W = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function fmtNow() {
  return `${MONTHS[NOW.getMonth()]} ${NOW.getDate()} ${NOW.getFullYear()} · ${NOW.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`;
}
function fmtRecv(iso) {
  if (!iso) return fmtNow();
  const d = new Date(iso);
  return `${DAYS_W[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} · ${d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`;
}

const css = `
  *{box-sizing:border-box}
  /* the app container alone left white showing through on overscroll and
     anywhere the container did not reach */
  html,body{background:#0b1014;margin:0}
  .lr-app{background:#0b1014;min-height:100vh;font-family:'Liberation Sans','DejaVu Sans',Arial,sans-serif}
  .lr-mono{font-family:'DejaVu Sans Mono','Liberation Mono',monospace}
  .lr-serif{font-family:'Liberation Serif','DejaVu Serif',Georgia,serif}
  .lr-nav{background:#101921;border-bottom:1px solid #2b3a47;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  .lr-nav-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid #5cb083;background:rgba(92,176,131,.1);border-radius:2px}
  /* ── brand lockup (nav only — the Report keeps its own ShieldLogo) ── */
  .lr-brand{display:flex;align-items:center;gap:13px}
  .lr-brand-logo{overflow:visible;flex-shrink:0}
  .lr-wordmark{font-size:22px;font-weight:600;line-height:1;letter-spacing:.14em;text-transform:uppercase;color:#eef3f7;white-space:nowrap}
  .lr-brand-sub{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#c89456;margin-top:5px;white-space:nowrap}
  .lr-live-dot{width:6px;height:6px;border-radius:50%;background:#5cb083;display:inline-block;box-shadow:0 0 6px #5cb083}
  @media(prefers-reduced-motion:no-preference){
    .lr-brand-logo .bl-glow{animation:lr-logo-glow 2.4s cubic-bezier(.65,0,.35,1) infinite}
    .lr-live-dot{animation:lr-live-pulse 2s ease-in-out infinite}
  }
  @keyframes lr-logo-glow{0%,100%{opacity:.2}50%{opacity:1}}
  @keyframes lr-live-pulse{
    0%,100%{transform:scale(1);opacity:.72;box-shadow:0 0 4px rgba(92,176,131,.45)}
    50%{transform:scale(1.18);opacity:1;box-shadow:0 0 10px rgba(92,176,131,.95),0 0 0 3px rgba(92,176,131,.12)}
  }
  .lr-log{padding:12px 16px;border-bottom:1px solid #21303b;background:#0d141b}
  .lr-log-label{font-size:8px;letter-spacing:2px;color:#56697b;text-transform:uppercase;margin-bottom:8px}
  .lr-log-group-label{font-size:8px;letter-spacing:1.5px;color:#56697b;text-transform:uppercase;margin-bottom:5px;margin-top:8px}
  .lr-log-group-label:first-child{margin-top:0}
  .lr-log-group + .lr-log-group{margin-top:6px}
  /* A date header is a control, but as bare grey text among grey labels it read
     as a caption — hence the surface, the amber the app already uses for "you
     can act on this", and the box treatment. It is an index entry either way, so
     open and closed are the same size, padding and type: only the arrow turns
     and the rows appear. Sized just under .lr-log-label, the list heading above
     it, so the dates read as structure rather than as content. */
  .lr-log-group-hdr{display:flex;align-items:center;gap:8px;width:100%;
    padding:5px 10px;min-height:24px;text-align:left;cursor:pointer;
    background:#141d25;border:1px solid #26333f;border-radius:5px;margin-bottom:4px;
    -webkit-tap-highlight-color:transparent;
    transition:background .15s ease,border-color .15s ease,transform .09s ease}
  .lr-log-group-hdr .lr-log-group-label{margin:0;color:#eef3f7;font-size:7.5px}
  .lr-log-caret{display:inline-block;font-size:6.5px;color:#c89456;transform:rotate(0deg);transition:transform .18s ease;flex-shrink:0}
  .lr-log-caret.open{transform:rotate(90deg)}
  .lr-log-count{margin-left:auto;font-size:7.5px;letter-spacing:1px;color:#82a0ba;
    background:#0d141b;border:1px solid #26333f;border-radius:8px;padding:1px 6px;
    line-height:1.4;flex-shrink:0}
  .lr-log-item{display:flex;align-items:center;flex-wrap:wrap;row-gap:3px;gap:8px;padding:8px 10px;border:1px solid #21303b;border-radius:3px;background:#141d25;cursor:pointer;transition:border-color .15s}
  .lr-log-item:hover{border-color:#2b3a47}
  /* Selection wears the row's own tier colour rather than a single amber, so a
     glance at the open row says which tier it is. Both come from TIER_DOT_COLORS
     via the inline --tier / --tier-fill; the amber values remain as fallbacks.
     Layered over the opaque base rather than replacing it — a translucent row
     let the swipe panel behind it paint through, which is BUG 1. */
  .lr-log-item.active{border-color:var(--tier,#c89456);
    background:linear-gradient(var(--tier-fill,rgba(200,148,86,.06)),
      var(--tier-fill,rgba(200,148,86,.06))),#141d25}
  .lr-log-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .lr-log-name{font-size:11px;color:#eef3f7;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* Amber here read as a priority signal, which is the tier pill's job. The dot
     and the pill are the only tier-coloured things in a row. */
  .lr-log-time{font-size:9px;color:#eef3f7;flex-shrink:0}
  /* tier word, styled as the pill: colour at full strength on itself at 15%,
     both set inline from TIER_DOT_COLORS. nowrap so EMERGENCY never breaks. */
  .lr-log-tier{flex-shrink:0;white-space:nowrap;font-size:7.5px;letter-spacing:.08em;
    font-weight:600;text-transform:uppercase;line-height:1.2;padding:3px 6px;border-radius:3px}
  /* order:1 drops it below everything else; flex-basis 100% gives it the line
     to itself. The label holds its width; only the value ellipsises. */
  .lr-log-problem{order:1;flex:0 0 100%;min-width:0;display:flex;align-items:baseline;
    gap:6px;line-height:1.3}
  .lr-log-problem-lbl{flex-shrink:0;font-size:7.5px;letter-spacing:1px;
    text-transform:uppercase;color:#eef3f7}
  .lr-log-problem-val{min-width:0;font-size:9.5px;color:#eef3f7;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-log-chevron{font-size:10px;color:#56697b;flex-shrink:0}
  /* The reveal shell, shared. Mobile drags it with a finger, desktop slides it
     on a click — same panel, same direction, same transition. */
  .lr-swipe{display:block;position:relative;overflow:hidden;border-radius:3px;margin-bottom:4px}
  .lr-swipe-actions{display:flex;position:absolute;top:0;right:0;bottom:0}
  .lr-swipe-btn{border:none;font-family:'DejaVu Sans Mono','Liberation Mono',monospace;
    font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#eef3f7;
    cursor:pointer;padding:0 12px;white-space:nowrap}
  .lr-swipe-btn.arch{background:#2b3a47}
  .lr-swipe-btn.del{background:#a33f35}
  .lr-swipe-btn.rest{background:#2f5f8a}
  /* sized for the longer of its two labels, in ch because the face is monospace,
     so arming the confirmation swaps the text without moving the row */
  .lr-swipe-btn.wide{min-width:16ch}
  .lr-swipe-btn.armed{background:#c2483c;font-weight:700}
  /* plain destructive text, not a button in a box — it sits on the count row */
  .lr-danger-link{margin-left:auto;background:none;border:none;padding:0 2px;
    color:#f0a59b;font-size:8px;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .lr-danger-link:hover{text-decoration:underline}
  /* view switcher lives in the log's own header row */
  .lr-log-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
  .lr-log-head .lr-log-label{margin-bottom:0}
  .lr-log-views{display:flex;gap:4px;flex-shrink:0}
  .lr-view-btn{background:none;border:1px solid #21303b;color:#56697b;font-size:8px;
    letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:2px;cursor:pointer}
  .lr-view-btn.on{border-color:#c89456;color:#e6b074;background:rgba(200,148,86,.08)}
  .lr-log-none{font-size:11px;color:#56697b;padding:10px 2px}
  .lr-empty-title{font-size:15px;color:#eef3f7;font-weight:600;margin-bottom:6px}
  .lr-empty-body{font-size:12px;color:#82a0ba;line-height:1.5;max-width:340px}
  .lr-report{padding:0 16px 32px}
  .lr-card{position:relative;border:1px solid #2b3a47;overflow:hidden;background:linear-gradient(180deg,#101921 0%,#0d141b 100%);margin-top:12px;border-radius:4px}
  .lr-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(130,160,186,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(130,160,186,.04) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
  .lr-crop{position:absolute;width:11px;height:11px;border-color:#c89456;opacity:.6;z-index:3}
  .lr-crop.tl{top:8px;left:8px;border-left:1.5px solid;border-top:1.5px solid}
  .lr-crop.tr{top:8px;right:8px;border-right:1.5px solid;border-top:1.5px solid}
  .lr-crop.bl{bottom:8px;left:8px;border-left:1.5px solid;border-bottom:1.5px solid}
  .lr-crop.br{bottom:8px;right:8px;border-right:1.5px solid;border-bottom:1.5px solid}
  .lr-pad{position:relative;z-index:1;padding:16px}
  .sec-title{font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:#82a0ba;margin-bottom:5px;display:flex;align-items:center;gap:5px;font-weight:600}
  .field-lbl{font-size:7.5px;letter-spacing:1.5px;text-transform:uppercase;color:#82a0ba;margin-bottom:1px;display:block;font-weight:500}
  .field-val{font-size:clamp(9px,2.8vw,11px);color:#eef3f7;font-weight:500;line-height:1.35}
  .field-val-dim{font-size:clamp(9px,2.5vw,10px);color:#aebfcc;line-height:1.35}
  .div-h{border:none;border-top:1px solid #21303b;margin:.35rem 0}
  /* The phone number is the most-used thing on the report, so it outranks
     everything below it. Only the caller's name is larger. */
  .rpt-phone-row{display:flex;align-items:center;gap:5px}
  .rpt-phone-row .field-icon{font-size:14px}
  .rpt-phone{font-size:clamp(15px,4.2vw,19px);color:#eef3f7;font-weight:700;
    line-height:1.2;letter-spacing:.5px}
  /* Same card as Tone read and Dispatch note — identical padding, background,
     radius and 2px left border — so the three read as one family in amber,
     green and steel. Steel is #82a0ba rather than the brighter #378add on
     purpose: #378add is the Standard tier colour, and a blue rule here would
     read as a priority signal. */
  .rpt-reach-card{padding:5px 7px;background:#0d141b;
    border:1px solid rgba(130,160,186,.2);border-left:2px solid #82a0ba;
    border-radius:2px;margin-top:2px}
  /* Parsed time and preference, one line. Short enough now that it needs no
     flex gymnastics — the quote it used to compete with has its own line. */
  .rpt-reach{margin-top:1px;font-size:10px;color:#82a0ba;line-height:1.35}
  /* "when can I call this person" is the question the card answers, so the time
     is the one bright, large thing in it — the preference and the quote qualify
     it and stay dim. */
  .rpt-reach-time{font-size:clamp(12px,3vw,14px);color:#eef3f7;font-weight:700;
    letter-spacing:.3px}
  .rpt-reach-sep{color:#56697b;margin:0 5px}
  /* The caller's own words, whole. Wraps to as many lines as it takes. */
  .rpt-quote-line{margin-top:4px;font-size:10px;color:#82a0ba;font-style:italic;
    line-height:1.45;overflow-wrap:anywhere}
  /* Desktop joins the two address halves into one line; the comma belongs to the
     second half, so it disappears with it when there is no city or state. */
  .rpt-addr-2::before{content:", "}
  .box{background:#141d25;border:1px solid #21303b;border-radius:3px;padding:.75rem;margin-bottom:8px}
  .box:last-child{margin-bottom:0}
  .lr-day{width:18px;height:18px;border-radius:2px;display:flex;align-items:center;justify-content:center;border:1px solid #21303b;background:#0d141b}
  .lr-day .dl{font-size:7px;color:#56697b;font-weight:700;line-height:1}
  .lr-day.on{background:rgba(200,148,86,.2);border-color:#c89456}
  .lr-day.on .dl{color:#e6b074}
  .lr-tier{display:flex;align-items:center;gap:6px;padding:3px 7px;border-radius:3px;border:1px solid #21303b;background:#0d141b;opacity:.35;margin-bottom:3px}
  /* centred, not flex-start: the tier name sat at the top of the row with dead
     space under it whenever the reason wrapped to a second or third line */
  .lr-tier.active{opacity:1;border-left-width:3px;padding:7px 9px;align-items:center}
  .lr-tier.active .tn{font-size:9px}
  .lr-tier.active .tr{font-size:10.5px;line-height:1.45}
  .lr-tier .tdot{width:5px;height:5px;border-radius:50%;flex-shrink:0;background:#21303b}
  .lr-tier .tn{font-size:7.5px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#56697b}
  .lr-tier .tr{font-size:7.5px;color:#aebfcc}
  /* Size-only utilities. Each mirrors exactly the inline fontSize it replaced,
     so desktop is unchanged — but the mobile media query can now reach them.
     Declared after .sec-title so a "sec-title fs-8" element still lands on 8px. */
  .fs-7{font-size:7px}
  .fs-75{font-size:7.5px}
  .fs-8{font-size:8px}
  .fs-9{font-size:9px}
  .field-icon{font-size:10px}
  .lr-ico{width:1em;height:1em;flex-shrink:0;display:inline-block;vertical-align:-.125em}
  /* Report body copy. Each clamp is verbatim from the inline style it replaced,
     so desktop is byte-identical; the mobile block below raises the floors,
     which a clamp cannot do on its own (a min above the max wins everywhere). */
  .rpt-recap{font-size:clamp(9px,2.5vw,10.5px)}
  .rpt-body{font-size:clamp(8px,2.2vw,9.5px)}
  .rpt-quote{font-size:clamp(8px,2vw,9px)}
  /* Hero spacing lifted out of the inline style, verbatim, so the mobile block
     can collapse it. */
  .rpt-hero{display:flex;padding-bottom:12px;border-bottom:1px solid #21303b;margin-bottom:12px}
  .rpt-footer{display:flex}
  /* display lives here, not inline, so the mobile block can hide these at all —
     an inline display beats a class rule. Values match the originals. */
  .rpt-header{display:flex}
  .rpt-recovered{display:inline-flex}
  /* Caller-block wrappers are inert on desktop: display:contents makes the
     pill, name and descriptor behave as direct children of .box exactly as
     they did before, and the case/received meta only exists on mobile. */
  .rpt-lead-top{display:contents}
  .rpt-lead-head{display:contents}
  .rpt-lead-meta{display:none}
  /* Halves of the left box. Inert everywhere except mobile, where the report
     is a single column and Priority slots between them — their .box styling
     only takes effect once they stop being display:contents. */
  .rpt-lead-section,.rpt-story-section{display:contents}
  @media(min-width:768px){
    .lr-layout{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
    .lr-sidebar{border-right:1px solid #21303b;background:#0d141b;overflow-y:auto;height:100vh;position:sticky;top:0}
    .lr-main{overflow-y:auto}
    .lr-nav{display:none}
    .lr-sidebar-nav{background:#101921;border-bottom:1px solid #2b3a47;padding:14px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
    .lr-log{padding:14px 16px;border-bottom:none}
    .lr-report{padding:0 20px 32px}
    .lr-card{margin-top:16px}
    .lr-pad{padding:20px}
    .report-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:10px;align-items:start}
    .report-right{display:flex;flex-direction:column;gap:8px}
    .lr-log-mobile{display:none}
  }
  @media(max-width:767px){
    .lr-layout{display:flex;flex-direction:column}
    .lr-sidebar-nav{display:none}
    .report-grid{display:flex;flex-direction:column;gap:8px}
    /* Priority reads as triage context for the story that follows, so on a
       phone it sits between the caller details and the call recap rather than
       below both. Dissolving the two column wrappers makes every section a
       direct flex child, which is what the order property needs to work; each
       half of the old left box then stands on its own as a card. */
    .rpt-left,.report-right{display:contents}
    .rpt-lead-section,.rpt-story-section{display:block;margin-bottom:0}
    /* One field per row on a phone. A 1fr column cannot shrink below its
       content's min-content width, and a long unbroken value pushed the second
       column off the screen entirely. Full width fits the address, and the
       labels stop wrapping into two lines as a bonus. */
    .rpt-fields{grid-template-columns:1fr !important;gap:10px 0 !important}
    /* the caller name is clamp(18px,5vw,24px) — 18.75px at 375px — so the
       number sits just under it rather than over it */
    .rpt-phone{font-size:17px}
    .rpt-phone-row .field-icon{font-size:15px}
    .rpt-reach{font-size:12px}
    .rpt-reach-time{font-size:16px}
    .rpt-quote-line{font-size:12px}
    /* street on one line, city and state on the next: joined, the two wrapped
       awkwardly mid-address at this width */
    .rpt-addr-2{display:block}
    .rpt-addr-2::before{content:none}
    /* belt and braces: a grid item defaults to min-width:auto, so without this
       a longer address than any seen so far could overflow again */
    .rpt-fields > div{min-width:0}
    .field-val,.field-val-dim{overflow-wrap:anywhere}
    .rpt-lead-section{border-left:3px solid var(--rpt-accent,#c89456);order:1}
    .rpt-priority{order:2}
    .rpt-story-section{order:3}
    .rpt-problem{order:4}
    /* separated the two halves inside one card; now they are two cards */
    .rpt-story-section > .div-h{display:none}
    .rpt-story-section > div{margin-top:0 !important}

    /* readable type on a phone */
    .lr-pad{padding:14px}
    .box{padding:12px}
    .field-lbl{font-size:10px}
    .field-val{font-size:15px}
    .field-val-dim{font-size:14px}
    .sec-title{font-size:11px}
    .lr-log-label{font-size:11px}
    .lr-log-group-hdr{padding:6px 12px;min-height:28px;gap:9px}
    .lr-log-group-hdr .lr-log-group-label{font-size:10px}
    .lr-log-caret{font-size:8.5px}
    .lr-log-count{font-size:10px;padding:1px 7px}
    .lr-tier .tn{font-size:10px}
    .lr-tier .tr{font-size:10px}
    .lr-tier.active .tn{font-size:11.5px}
    .lr-tier.active .tr{font-size:13px;line-height:1.45}
    .lr-day{width:26px;height:26px}
    .lr-day .dl{font-size:10px}
    .ai-img-label{font-size:9px}
    .field-icon{font-size:13px}
    /* after .sec-title above, so "sec-title fs-8" resolves to 10px not 11px */
    .fs-7{font-size:9px}
    .fs-75{font-size:9.5px}
    .fs-8{font-size:10px}
    .fs-9{font-size:11px}
    /* body copy must read larger than the label above it, not smaller */
    .rpt-recap{font-size:14px}
    .rpt-body{font-size:14px}
    .rpt-quote{font-size:14px}
    /* neither the header nor the footer fits as a single row at these sizes:
       the meta blocks grew enough to squeeze the titles into wrapping */
    .rpt-footer{flex-wrap:wrap;gap:10px}
    .rpt-header{flex-wrap:wrap;gap:10px}

    /* ── single-column accordion ──────────────────────────────────────────
       The sidebar log and the standalone report pane are both desktop-only.
       On a phone the mobile log IS the page: day groups → call rows → the
       report expanded inline under whichever row is open. */
    .lr-sidebar{display:none}
    .lr-report{display:none}
    .lr-tools{display:none}
    .lr-log{padding:12px;border-bottom:none}
    .lr-mobile-state{padding:0 12px 16px}
    /* The report appearing instantly reads as a page swap; easing it in ties
       it to the row you just pressed, so the eye follows instead of relocating.
       Guarded below for anyone who asked for less motion. */
    .lr-inline-report{margin:8px 0 12px}
    @media(prefers-reduced-motion:no-preference){
      .lr-inline-report{animation:lr-report-in .3s cubic-bezier(.22,.68,.32,1) both}
    }
    @keyframes lr-report-in{
      from{opacity:0;transform:translateY(-8px) scale(.99)}
      to{opacity:1;transform:none}
    }
    /* clears the sticky .lr-nav when a row is scrolled to the top */
    /* Trimmed report header. The brand lockup is already in the nav, and the
       eyebrow / subtitle / RECOVERED badge restate what the page says anyway.
       Case + received move into the caller block, so the whole header row goes
       — border included, leaving no gap where it was. */
    .rpt-header{display:none}
    .rpt-eyebrow{display:none}
    .rpt-submeta{display:none}
    .rpt-recovered{display:none}
    /* The outer report card is scaffolding on a phone: its "Lead rescued."
       heading, border, grid backdrop, crop marks and padding all go, and the
       .box sections inside become the full-width cards. */
    .rpt-hero{display:none}
    .rpt-footer{display:none}
    .lr-card{border:none;background:none;border-radius:0;margin-top:0}
    .lr-grid-bg{display:none}
    .lr-crop{display:none}
    .lr-pad{padding:0}
    /* float, not flex: the name and descriptor flow around the meta and then
       reclaim full width below it, instead of being pinned into a narrow column */
    .rpt-lead-top{display:block}
    .rpt-lead-top::after{content:"";display:block;clear:both}
    .rpt-lead-head{display:block}
    .rpt-lead-meta{display:block;float:right;max-width:48%;margin:0 0 4px 12px;
      text-align:right;line-height:1.7;color:#56697b;text-transform:uppercase;letter-spacing:.5px}

    .lr-log-item.open{border-color:var(--tier,#c89456);
      background:linear-gradient(var(--tier-fill,rgba(200,148,86,.06)),
        var(--tier-fill,rgba(200,148,86,.06))),#141d25}
    .lr-log-item.open .lr-log-chevron{transform:translateY(-50%) rotate(90deg)}

    /* call log as stacked cards */
    .lr-log-item{display:flex;align-items:center;gap:10px;position:relative;
      padding:11px 26px 11px 14px;margin-bottom:6px;
      -webkit-tap-highlight-color:transparent;
      transition:border-color .15s ease,background .15s ease,transform .09s ease}
    /* Press feedback. iOS gives none once tap-highlight is cleared, and a
       control that does not react to a finger feels broken on touch — the
       press is the only moment the app can confirm it heard you. */
    @media(prefers-reduced-motion:reduce){
      .lr-log-group-hdr,.lr-log-item{transition:background .15s ease,border-color .15s ease}
    }
    .lr-log-group-hdr:active{transform:scale(.975);background:rgba(200,148,86,.14);
      border-color:rgba(200,148,86,.5)}
    .lr-log-item:active{transform:scale(.985);background:#1a242e;
      border-color:#3a4a58}
    @media(prefers-reduced-motion:reduce){
      .lr-log-group-hdr:active,.lr-log-item:active{transform:none}
    }
    /* mobile drags a fixed-width panel, so its threshold math stays put */
    .lr-swipe{margin-bottom:6px}
    .lr-swipe-actions{width:var(--swipe-w,96px)}
    .lr-swipe-btn{flex:1;font-size:10px}
    /* pan-y keeps vertical scrolling with the browser and hands us the
       horizontal gesture, so the drag needs no preventDefault */
    .lr-log-item{display:flex;align-items:center;flex-wrap:wrap;row-gap:3px;gap:8px;
      position:relative;padding:11px 24px 11px 13px;margin-bottom:0;touch-action:pan-y}
    .lr-log-item::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:2px 0 0 2px;background:var(--tier,#82a0ba)}
    /* the edge bar already carries the tier colour here — see the note on
       CallLogItem for why the dot stays hidden on a phone */
    .lr-log-dot{display:none}
    /* Same two-line structure as desktop — order and flex come from the base
       rules, so only the type scale differs between platforms. Line 1 no longer
       shares its width with the problem title, so tier and name go back up. */
    .lr-log-tier{font-size:10px;padding:3px 9px;border-radius:4px}
    .lr-log-name{font-size:14px;font-weight:600;line-height:1.25}
    .lr-log-problem{line-height:1.3;gap:7px}
    .lr-log-problem-lbl{font-size:9px}
    .lr-log-problem-val{font-size:11.5px}
    .lr-log-time{font-size:11px;line-height:1.2}
    .lr-danger-link{font-size:10px}
    .lr-log-views{gap:5px}
    .lr-view-btn{font-size:10px;padding:4px 9px}
    .lr-log-none{font-size:13px}
    .lr-log-chevron{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:15px;transition:transform .18s ease}
  }
  .gen-btn{background:rgba(200,148,86,.12);border:1px solid #c89456;color:#e6b074;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:2px;cursor:pointer}
  .gen-btn:hover{background:rgba(200,148,86,.22)}
  .json-area{width:100%;height:160px;background:#0b1014;color:#82a0ba;border:1px solid #2b3a47;border-radius:3px;padding:10px;font-family:monospace;font-size:10px;resize:vertical;outline:none}
  .json-area:focus{border-color:#c89456}
  .err-box{background:rgba(220,91,78,.12);border:1px solid rgba(220,91,78,.4);color:#f0a59b;font-family:monospace;font-size:10px;padding:8px 12px;border-radius:2px;margin-top:6px}
  .ai-img-label{font-family:'DejaVu Sans Mono',monospace;font-size:7px;letter-spacing:1.5px;color:#4a7a9b;text-transform:uppercase;text-align:center;margin-top:5px;opacity:.7}
`;

// One row shape on both platforms, two lines: dot / tier / name / time / chevron,
// then the problem title beneath on its own line. order:1 + flex-basis:100% on
// .lr-log-problem does the wrapping, so the markup is identical everywhere and
// only the type scale is per-platform.
// The dot stays hidden on mobile — the 4px --tier edge bar already carries the
// colour there, and a second marker 11px away would encode the tier twice.
function CallLogItem({ call, isActive, expanded, rowId, onClick, revealed, actions }) {
  const tier = call.report_json?.priority?.tier || "Standard";
  const dot = TIER_DOT_COLORS[tier] || "#82a0ba";
  const problem = call.report_json?.problem?.title || "";
  const [dx, setDx] = useState(0);
  const openRef = React.useRef(false);
  const drag = React.useRef(null);
  // One list feeds one panel on both platforms; only the trigger differs.
  const acts = actions || [];
  const swipeOn = acts.length > 0;
  // A single action reveals 96px; a pair shares 200px, enough for the longest
  // label ("Confirm delete?") while leaving the caller name and time readable.
  const swipeW = acts.length > 1 ? 200 : 96;   // two labels need the extra room
  // Which action is waiting for its second tap. Only the irreversible one asks,
  // and it asks on the button itself rather than in a dialog.
  const [armed, setArmed] = useState(null);
  const panelRef = React.useRef(null);
  const [panelW, setPanelW] = useState(0);
  // Desktop's panel sizes to its buttons, so measure it rather than assuming —
  // the archive view carries two actions where the log carries one.
  React.useLayoutEffect(() => {
    if (revealed && panelRef.current) setPanelW(panelRef.current.offsetWidth);
  }, [revealed, acts.length]);
  // touch drag or click reveal — same axis, same distance, same transition
  const offset = revealed ? -panelW : dx;
  // closing the panel — by tap, by swiping back, or by opening another row —
  // cancels a pending confirmation rather than leaving it armed out of sight
  React.useEffect(() => { if (!offset && !revealed) setArmed(null); }, [offset, revealed]);

  // touch-action:pan-y on the row lets the browser keep vertical scrolling
  // while handing us horizontal gestures, so no preventDefault is needed and
  // React's passive listeners are fine.
  function onTouchStart(e) {
    if (!swipeOn) return;
    const t = e.touches[0];
    drag.current = {x:t.clientX, y:t.clientY, axis:null, base: openRef.current ? -swipeW : 0};
  }
  function onTouchMove(e) {
    const s0 = drag.current; if (!s0) return;
    const t = e.touches[0], mx = t.clientX - s0.x, my = t.clientY - s0.y;
    if (!s0.axis) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;      // below the slop threshold
      s0.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
    }
    if (s0.axis !== "x") return;
    setDx(Math.max(-swipeW, Math.min(0, s0.base + mx)));
  }
  function onTouchEnd() {
    const s0 = drag.current; drag.current = null;
    if (!s0 || s0.axis !== "x") return;
    const willOpen = dx < -swipeW / 2;
    openRef.current = willOpen;
    setDx(willOpen ? -swipeW : 0);
  }
  function handleClick() {
    // a swiped-open row absorbs the tap: close it rather than expanding
    if (openRef.current || dx !== 0) { openRef.current = false; setDx(0); return; }
    onClick();
  }
  function run(fn) { openRef.current = false; setDx(0); setArmed(null); fn(call); }

  return (
    <div className="lr-swipe" style={{"--swipe-w":`${swipeW}px`}}>
      {swipeOn && (
        // hidden and untappable until the row is actually displaced — an .active
        // row's tint is not fully opaque, so anything still painted here shows
        // through it and, sitting underneath, steals the tap without acting
        <div ref={panelRef} className="lr-swipe-actions" aria-hidden={!offset && !revealed}
          style={{visibility: (offset || revealed) ? "visible" : "hidden",
                  pointerEvents: (offset || revealed) ? "auto" : "none"}}>
          {acts.map(a => (
            <button key={a.label} type="button"
              className={`lr-swipe-btn ${a.cls}${armed === a.label ? " armed" : ""}`}
              tabIndex={(offset || revealed) ? 0 : -1}
              onClick={e => {
                e.stopPropagation();
                // first tap on an irreversible action only arms it
                if (a.confirm && armed !== a.label) { setArmed(a.label); return; }
                run(a.run);
              }}>{armed === a.label ? a.confirm : a.label}</button>
          ))}
        </div>
      )}
      <div id={rowId} className={`lr-log-item${isActive?" active":""}${expanded?" open":""}`}
        style={{"--tier":dot, "--tier-fill":`rgba(${hexToRgb(dot)},.06)`,
                transform: offset ? `translateX(${offset}px)` : undefined,
                transition: drag.current ? "none" : "transform .18s ease"}}
        onClick={handleClick}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        role={rowId?"button":undefined} aria-expanded={rowId?!!expanded:undefined}>
        <span className="lr-log-dot" style={{background:dot,boxShadow:isActive?`0 0 5px ${dot}`:undefined}}/>
        <span className="lr-log-tier lr-mono"
          style={{color:dot,background:`rgba(${hexToRgb(dot)},.15)`}}>{tier}</span>
        <span className="lr-log-name lr-mono">{call.caller_name||"Unknown"}</span>
        {problem && (
          <span className="lr-log-problem">
            <span className="lr-log-problem-lbl lr-mono">Reason for call</span>
            <span className="lr-log-problem-val">{problem}</span>
          </span>
        )}
        <span className="lr-log-time lr-mono">{fmtTime(call.created_at)}</span>
        <span className="lr-log-chevron">›</span>
      </div>
    </div>
  );
}
const LOG_VIEWS = [["log","Log"],["archive","Archive"],["trash","Trash"]];
const LOG_LABEL = {
  log:     n => `${n} rescued call${n!==1?"s":""}`,
  archive: n => `${n} archived`,
  trash:   n => `${n} in trash`
};
const EMPTY_VIEW = { log:"No calls in the log.", archive:"Nothing archived.", trash:"Trash is empty." };

// Two modes, one component so the grouping and day-collapse logic stays shared:
//  - default (desktop sidebar): rows select, the report lives in its own pane
//  - accordion (mobile): rows toggle, the report renders inline under the open row
function CallLog({ calls, selectedId, onSelect, accordion=false, expandedId=null, onToggle, rptNum,
                   view="log", onViewChange, onEmptyTrash, rowActions, images={} }) {
  // date label -> bool. Absent = use the default (Today open, everything else collapsed).
  const [openOverrides, setOpenOverrides] = useState({});
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  useEffect(() => { setConfirmEmpty(false); }, [view]);
  // desktop: which row has its actions showing (one at a time, null = none)
  const [revealedId, setRevealedId] = useState(null);
  const currentId = accordion ? expandedId : selectedId;

  const groups = [];
  const groupIndex = {};
  calls.forEach(c => {
    const g = fmtDateGroup(c.created_at);
    if (groupIndex[g] === undefined) { groupIndex[g] = groups.length; groups.push([g, []]); }
    groups[groupIndex[g]][1].push(c);
  });

  return (
    <div className="lr-log">
      <div className="lr-log-head">
        <div className="lr-log-label lr-mono">{LOG_LABEL[view](calls.length)}</div>
        {/* inline beside the count rather than in a container of its own — a
            bordered box here read as a second card above the day headers */}
        {view === "trash" && calls.length > 0 && onEmptyTrash && (
          <button type="button" className="lr-danger-link lr-mono"
            onClick={()=>{
              if (!confirmEmpty) { setConfirmEmpty(true); return; }
              setConfirmEmpty(false); onEmptyTrash();
            }}>
            {confirmEmpty ? `Delete all ${calls.length}?` : "Empty trash"}
          </button>
        )}
        {onViewChange && (
          <div className="lr-log-views">
            {LOG_VIEWS.map(([key,label]) => (
              <button key={key} type="button"
                className={`lr-view-btn lr-mono${view===key?" on":""}`}
                aria-pressed={view===key}
                onClick={()=>onViewChange(key)}>{label}</button>
            ))}
          </div>
        )}
      </div>
      {calls.length === 0 && <div className="lr-log-none lr-mono">{EMPTY_VIEW[view]}</div>}
      {groups.map(([date, items], groupIdx) => {
        const hasCurrent = items.some(c => c.id === currentId);
        // Default the most recent group open rather than the literal "Today":
        // on a day with no calls yet there is no Today group, and keying off the
        // label left every group collapsed and the list empty. groups[] is built
        // from a created_at.desc fetch, so index 0 is always the newest day.
        const userOpen = openOverrides[date] !== undefined ? openOverrides[date] : groupIdx === 0;
        // Forcing a group open because it holds the current call only makes sense
        // on mobile, where the report renders INSIDE the group — collapsing there
        // would hide the very thing you are reading, so PR #12 closes the report
        // too. On desktop the report lives in its own pane, so a group's collapse
        // state is purely a list concern and the selection must not veto it.
        // Without this guard the group holding the selection can never collapse,
        // which is Today on every load.
        const open = (accordion && hasCurrent) || userOpen;
        return (
          <div key={date} className="lr-log-group">
            <button
              type="button"
              className="lr-log-group-hdr"
              aria-expanded={open}
              onClick={()=>{
                const next = !open;
                // Collapsing the group that holds the open inline report must
                // close that report too — otherwise hasCurrent keeps forcing
                // the group open and the header ignores every tap. (Today is
                // the usual victim: the newest call auto-expands on load.)
                if (!next && accordion && hasCurrent) {
                  const current = items.find(c => c.id === currentId);
                  if (current) onToggle(current);
                }
                setOpenOverrides(prev => ({...prev, [date]: next}));
              }}
            >
              <span className={`lr-log-caret${open?" open":""}`}>▶</span>
              <span className="lr-log-group-label lr-mono">{date}</span>
              <span className="lr-log-count lr-mono">{items.length}</span>
            </button>
            {open && items.map(c => {
              const isCurrent = c.id === currentId;
              return (
                <React.Fragment key={c.id}>
                  <CallLogItem
                    call={c}
                    revealed={!accordion && revealedId === c.id}
                    actions={rowActions}
                    isActive={isCurrent}
                    expanded={accordion && isCurrent}
                    // id only in accordion mode — the desktop log renders the same
                    // calls, and duplicate DOM ids would break the scroll target
                    rowId={accordion ? `lr-row-${c.id}` : undefined}
                    // Desktop: a row click never closes a report. First click on a
                    // different row opens it and clears any revealed actions; clicking
                    // the row that is already open toggles its actions instead.
                    onClick={()=>{
                      if (accordion) { onToggle(c); return; }
                      if (currentId !== c.id) { onSelect(c); setRevealedId(null); }
                      else { setRevealedId(prev => prev === c.id ? null : c.id); }
                    }}
                  />
                  {accordion && isCurrent && (
                    <div className="lr-inline-report">
                      <Report call={c} rptNum={rptNum} imageUrl={images[c.id]}/>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="lr-card">
      <div className="lr-grid-bg"/>
      <span className="lr-crop tl"/><span className="lr-crop tr"/>
      <span className="lr-crop bl"/><span className="lr-crop br"/>
      <div className="lr-pad" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:4,padding:"40px 20px"}}>
        <ShieldLogo size={38}/>
        <div className="lr-serif lr-empty-title" style={{marginTop:8}}>No calls yet</div>
        <div className="lr-empty-body">Every rescued call will appear here the moment it comes in.</div>
      </div>
    </div>
  );
}

// No ?client= in the URL. Distinct from "no calls" on purpose: silently
// defaulting to a shared dashboard would show one client another's calls.
function NoClientState() {
  return (
    <div className="lr-card">
      <div className="lr-grid-bg"/>
      <span className="lr-crop tl"/><span className="lr-crop tr"/>
      <span className="lr-crop bl"/><span className="lr-crop br"/>
      <div className="lr-pad" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:4,padding:"40px 20px"}}>
        <ShieldLogo size={38}/>
        <div className="lr-serif lr-empty-title" style={{marginTop:8}}>No dashboard specified</div>
        <div className="lr-empty-body">This link is missing its dashboard ID. Open the link from your setup email — it ends with <span className="lr-mono">?client=…</span></div>
      </div>
    </div>
  );
}

const FAILURE_LABEL = {
  auth:"Credentials rejected", api:"API error",
  network:"Network error", timeout:"Request timed out"
};

// A credentials failure is its own thing, not a generic API error: nothing about
// the connection or the data is wrong, and no amount of retrying will help — the
// key needs replacing. PostgREST reports it as 401/403 or a PGRST3xx code, and
// Supabase's gateway as a plain "Invalid API key".
const AUTH_CODES = new Set(["PGRST301","PGRST302","PGRST303"]);
function isAuthFailure(http, code, message) {
  return http === 401 || http === 403 || AUTH_CODES.has(code)
    || /invalid api key|jwt (expired|invalid)|no api key/i.test(message || "");
}

function fmtBytes(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1048576).toFixed(1)} MB`;
}

function LoadErrorState({ clientId, failure, onRetry }) {
  const f = failure || {};
  const auth = f.kind === "auth";
  // Everything worth pasting into a bug report, in one block. status leads: a
  // response with no body used to surface as a bare "HTTP 500" in the message
  // slot with the status itself nowhere to be seen. On an abort, how far it got
  // is the whole story — "timed out, 4.2 MB in 15s" points at the payload,
  // where "timed out" alone points nowhere.
  const detail = [
    f.http     && `status:   HTTP ${f.http}`,
    f.message  && `message:  ${f.message}`,
    f.code     && `code:     ${f.code}`,
    f.details  && `details:  ${f.details}`,
    f.hint     && `hint:     ${f.hint}`,
    f.ms       && `elapsed:  ${(f.ms/1000).toFixed(1)}s`,
    // 0 B is worth printing, not hiding: "nothing ever arrived" and "4 MB then
    // stalled" are different faults and the number is the only thing separating them
    (f.bytes || f.kind === "timeout" || f.kind === "network")
      ? `received: ${fmtBytes(f.bytes || 0)}${f.kind === "timeout" ? " before the timeout" : ""}` : ""
  ].filter(Boolean).join("\n");
  return (
    <div className="lr-card" style={{borderColor:"rgba(220,91,78,.4)"}}>
      <div className="lr-grid-bg"/>
      <div className="lr-pad" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:4,padding:"40px 20px"}}>
        <div className="lr-mono fs-9" style={{letterSpacing:2,color:"#f0a59b",textTransform:"uppercase"}}>{FAILURE_LABEL[f.kind] || "Connection error"}</div>
        <div className="lr-serif lr-empty-title" style={{marginTop:6}}>
          {auth ? "Dashboard credentials rejected" : "Couldn't load your calls"}
        </div>
        <div className="lr-empty-body">
          {auth
            ? "The API key this dashboard uses was refused. Your connection is fine and no calls have been lost — the key needs replacing before the log will load."
            : "We couldn't reach the call log just now. Check your connection and refresh — nothing has been lost."}
        </div>
        {detail && (
          <code style={{fontSize:12,fontFamily:"monospace",color:"#d06b5f",wordBreak:"break-word",
            whiteSpace:"pre-wrap",padding:8,marginTop:12,background:"rgba(255,255,255,0.04)",
            borderRadius:6,textAlign:"left",maxWidth:"90%",marginLeft:"auto",marginRight:"auto",
            display:"block"}}>{detail}</code>
        )}
        <div style={{fontSize:11,color:"#6b7c8a"}}>client: {clientId || "(none)"}</div>
        {auth
          ? <div className="lr-mono" style={{fontSize:10,color:"#6b7c8a",marginTop:12,maxWidth:340,lineHeight:1.5}}>
              Retrying will not help. Replace SUPABASE_ANON in the dashboard build.
            </div>
          : <button className="gen-btn lr-mono" onClick={onRetry} style={{marginTop:16}}>Retry</button>}
      </div>
    </div>
  );
}

function Report({ call, rptNum, imageUrl:imageOverride }) {
  const d = call.report_json || {};
  const tier = d.priority?.tier || "Standard";
  const tc = TIER_COLORS[tier] || TIER_COLORS.Standard;
  const days = d.callback?.days || [];
  const dayCount = DAY_KEYS.filter(dk => isDayActive(dk, days)).length;
  const prefers = prefersPhrase(d.lead?.preferred_contact);
  // Split in two so the platforms can differ: one line on desktop, two on a
  // phone. Each half is filtered, so an absent city or state leaves neither a
  // blank row nor a dangling comma.
  const addrParts = cleanField(d.lead?.address_line2).split(",");
  const addrStreet = cleanField(d.lead?.address_line1);
  const addrRest = [cleanField(addrParts[0]), cleanField(addrParts.slice(1).join(","))]
    .filter(Boolean).join(", ");
  // Verbatim and complete. It has its own line now rather than a share of one,
  // so there is nothing to truncate against — every earlier limit existed only
  // to stop it pushing the contact preference off the row.
  const quote = cleanField(d.callback?.note);
  const imageUrl = imageOverride ?? call.image_url ?? null;

  return (
    <div className="lr-card" style={{"--rpt-accent":tc.border}}>
      <div className="lr-grid-bg"/>
      <span className="lr-crop tl"/><span className="lr-crop tr"/>
      <span className="lr-crop bl"/><span className="lr-crop br"/>
      <div className="lr-pad">

        {/* HEADER */}
        <div className="rpt-header" style={{justifyContent:"space-between",alignItems:"flex-start",paddingBottom:12,borderBottom:"1px solid #21303b",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <ShieldLogo size={32}/>
            <div>
              <div className="lr-serif" style={{fontSize:"clamp(16px,4vw,20px)",fontWeight:700,letterSpacing:2,color:"#eef3f7",lineHeight:1}}>LEAD RESCUE</div>
              <div className="lr-mono fs-7" style={{letterSpacing:"3px",color:"#c89456",textTransform:"uppercase",marginTop:3}}>Never miss another call</div>
            </div>
          </div>
          <div className="lr-mono fs-8" style={{textAlign:"right",lineHeight:1.9,color:"#56697b",textTransform:"uppercase",letterSpacing:1}}>
            <div>Case <span style={{color:"#aebfcc"}}>#{rptNum}</span></div>
            <div>Recv <span style={{color:"#aebfcc"}}>{fmtRecv(call.created_at)}</span></div>
            <div>Chan <span style={{color:"#aebfcc"}}>Inbound · Voice AI</span></div>
          </div>
        </div>

        {/* HERO */}
        <div className="rpt-hero" style={{alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div className="rpt-eyebrow lr-mono fs-7" style={{letterSpacing:"3px",color:"#c89456",textTransform:"uppercase",marginBottom:4}}>Call Intelligence — Dispatch Report</div>
            <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(22px,6vw,30px)",lineHeight:.95,color:"#eef3f7"}}>
              Lead <span style={{color:"#e6b074"}}>rescued.</span>
            </div>
            <div className="rpt-submeta lr-mono fs-75" style={{letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginTop:6}}>Missed on the main line · caught by Voice AI</div>
          </div>
          <div className="rpt-recovered" style={{alignItems:"center",gap:6,padding:"6px 10px",border:"1px solid #5cb083",background:"rgba(92,176,131,.1)",borderRadius:2,flexShrink:0,marginLeft:8}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#5cb083",boxShadow:"0 0 6px #5cb083",display:"inline-block"}}/>
            <span className="lr-mono fs-9" style={{letterSpacing:2,color:"#5cb083",textTransform:"uppercase",fontWeight:700}}>Recovered</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="report-grid">

          {/* LEFT BOX. The two halves inside are wrapped so mobile can slot
              Priority between them; on desktop the wrappers are display:contents,
              so this renders exactly as one box the way it always has. */}
          {/* accent follows the call's tier, like the log row's edge bar */}
          <div className="box rpt-left" style={{borderLeft:"3px solid var(--rpt-accent)",marginBottom:0}}>
           <div className="box rpt-lead-section">
            <div className="rpt-lead-top">
              {/* mobile only — mirrors the header meta the mobile view drops.
                  Comes first so the name/descriptor flow around the float. */}
              <div className="rpt-lead-meta lr-mono fs-8">
                <div>Case <span style={{color:"#aebfcc"}}>#{rptNum}</span></div>
                <div>Recv <span style={{color:"#aebfcc"}}>{fmtRecv(call.created_at)}</span></div>
              </div>
              <div className="rpt-lead-head">
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",border:`1px solid ${tc.border}`,background:tc.bg,borderRadius:2,marginBottom:6}}>
                  <span style={{width:4,height:4,borderRadius:"50%",background:tc.dot,display:"inline-block"}}/>
                  <span className="lr-mono fs-75" style={{letterSpacing:2,color:tc.text,textTransform:"uppercase",fontWeight:700}}>New Lead</span>
                </div>
                <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(18px,5vw,24px)",color:"#eef3f7",lineHeight:1,marginBottom:2}}>{d.lead?.name||"Unknown"}</div>
                <div className="lr-mono fs-75" style={{letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginBottom:6}}>{d.lead?.descriptor||""}</div>
              </div>
            </div>
            <div className="div-h"/>
            <div className="rpt-fields" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px",marginTop:".3rem",marginBottom:".6rem"}}>
              {/* The number stands alone under its label — nothing shares its line. */}
              <div className="rpt-phone-group" style={{gridColumn:"1 / -1"}}>
                <span className="field-lbl lr-mono">Phone</span>
                <div className="rpt-phone-row">
                  <Icon name="device-mobile" className="field-icon" style={{color:"#56697b"}}/>
                  <span className="rpt-phone lr-mono">{d.lead?.phone||"Not provided"}</span>
                </div>
              </div>

              {/* Timing as a card in the same family as Tone read and Dispatch
                  note: parsed value and preference on one line, the days beneath
                  when they narrow anything, then the caller's own words in full. */}
              <div style={{gridColumn:"1 / -1"}}>
                <div className="rpt-reach-card">
                <div className="sec-title lr-mono fs-8" style={{marginBottom:2,color:"#82a0ba"}}><Icon name="clock"/> Best time to reach</div>
                <div className="rpt-reach lr-mono">
                  <span className="rpt-reach-time">{d.callback?.time||"Anytime"}</span>
                  {prefers && <span className="rpt-reach-sep">·</span>}
                  {prefers && <span>{prefers}</span>}
                </div>
                {/* All seven lit says "any day", which is what no answer looks
                    like — so the strip only earns its space when it narrows things. */}
                {dayCount > 0 && dayCount < DAY_KEYS.length && (
                  <div style={{display:"flex",gap:3,marginTop:5}}>
                    {DAY_KEYS.map((dk,i)=>{
                      const on = isDayActive(dk,days);
                      return <div key={dk} className={`lr-day lr-mono${on?" on":""}`}><span className="dl">{DAY_LABELS[i]}</span></div>;
                    })}
                  </div>
                )}
                {quote && <div className="rpt-quote-line">"{quote}"</div>}
                </div>
              </div>

              {/* separates "how to reach them" from "where is it" */}
              <div className="div-h" style={{gridColumn:"1 / -1"}}/>
              <div style={{gridColumn:"1 / -1"}}>
                <span className="field-lbl lr-mono">Service address</span>
                <div style={{display:"flex",alignItems:"flex-start",gap:4}}>
                  <Icon name="map-pin" className="field-icon" style={{color:"#56697b",marginTop:1}}/>
                  {/* one line on desktop, two on a phone — the comma is drawn by
                      CSS so the split leaves nothing dangling */}
                  <div className="rpt-addr field-val lr-mono">
                    <span>{addrStreet || "Not provided"}</span>
                    {addrRest && <span className="rpt-addr-2">{addrRest}</span>}
                  </div>
                </div>
              </div>
            </div>
           </div>
           <div className="box rpt-story-section">
            <div className="div-h"/>
            <div style={{marginTop:".5rem"}}>
              <div className="sec-title lr-mono" style={{marginBottom:6}}><Icon name="file-description"/> What happened on the call</div>
              <RecapHtml html={d.recap||""}/>
              <div style={{padding:"5px 7px",background:"#0d141b",border:"1px solid rgba(200,148,86,.15)",borderLeft:"2px solid #c89456",borderRadius:2,marginTop:6,marginBottom:5}}>
                <div className="sec-title lr-mono fs-8" style={{marginBottom:2,color:"#c89456"}}><Icon name="eye"/> Tone read</div>
                <div className="rpt-body" style={{color:"#aebfcc",lineHeight:1.55}}>{d.tone_read||""}</div>
              </div>
              <div style={{padding:"5px 7px",background:"#0d141b",border:"1px solid rgba(92,176,131,.2)",borderLeft:"2px solid #5cb083",borderRadius:2}}>
                <div className="sec-title lr-mono fs-8" style={{marginBottom:2,color:"#5cb083"}}><Icon name="arrow-right"/> Dispatch note</div>
                <div className="rpt-body" style={{color:"#eef3f7",lineHeight:1.55}}>{d.dispatch_note||""}</div>
              </div>
            </div>
           </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="report-right">

            {/* Priority */}
            <div className="box rpt-priority" style={{marginBottom:0}}>
              <div className="sec-title lr-mono"><Icon name="alert-circle"/> Priority</div>
              {TIERS.map(t => {
                const isActive = t===tier;
                const c = TIER_COLORS[t];
                return (
                  <div key={t} className={`lr-tier lr-mono${isActive?" active":""}`}
                    style={isActive?{borderColor:`rgba(${hexToRgb(c.border)},.5)`,borderLeftColor:c.border,background:c.bg}:{}}>
                    <span className="tdot" style={isActive?{background:c.dot,boxShadow:`0 0 5px ${c.dot}`}:{}}/>
                    <span className="tn" style={{color:isActive?c.text:"#56697b"}}>{t.toUpperCase()}</span>
                    {isActive && (
                      <span className="tr" title={d.priority?.reason||""}>
                        {/* same de-duplication as the log row, but the report
                            has room, so fall back to the full reason rather
                            than showing an empty tier line */}
                        {distinctReason(d.priority?.reason||"", d.problem)
                          || d.priority?.reason || ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Problem + AI Image */}
            <div className="box rpt-problem" style={{borderLeft:"3px solid #e6b074",marginBottom:0,background:"#071020"}}>
              <div className="sec-title lr-mono"><Icon name="tool"/> Reported problem</div>
              <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(13px,4vw,16px)",fontWeight:700,color:"#e6b074",lineHeight:1,marginBottom:3}}>{d.problem?.title||"Unknown"}</div>
              <div className="rpt-body" style={{color:"#aebfcc",lineHeight:1.4,marginBottom:8}}>{d.problem?.detail||""}</div>

              {/* AI IMAGE OR FALLBACK */}
              <div style={{display:"flex",justifyContent:"center",padding:"4px 0 4px"}}>
                <ProblemIllustration imageUrl={imageUrl}/>
              </div>

              {imageUrl && (
                <div className="ai-img-label lr-mono">AI · Blueprint · Generated from call</div>
              )}

              <div className="rpt-quote" style={{textAlign:"center",padding:"3px 6px",background:"#0b1520",border:"1px solid #1a3a5c",borderRadius:2,marginTop:5}}>
                <span style={{color:"#56697b"}}>In their words: </span>
                <span style={{color:"#eef3f7",fontWeight:700}}>"{d.problem?.quote||""}"</span>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="rpt-footer" style={{justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:10,borderTop:"1px solid #21303b"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid rgba(92,176,131,.35)",padding:"2px 8px",borderRadius:2,transform:"rotate(-1.5deg)"}}>
            <span className="fs-8" style={{color:"#5cb083"}}>✓</span>
            <span className="lr-mono fs-7" style={{letterSpacing:"1.5px",color:"#5cb083",textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap"}}>Reviewed · Approved for delivery</span>
          </div>
          <div className="lr-mono fs-75" style={{textAlign:"right",letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",lineHeight:1.8}}>
            <div>Call intelligence by <span style={{color:"#c89456"}}>Lead Rescue</span></div>
            <div>Generated · {fmtNow()}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [calls, setCalls] = useState([]);
  const [selected, setSelected] = useState(null);
  // "loading" | "no-client" | "ready" | "error" — an API failure must never be
  // able to reach the zero-rows branch and render as "No calls yet"
  const [status, setStatus] = useState("loading");
  const [failure, setFailure] = useState(null);
  const [showInput, setShowInput] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const clientId = React.useRef(
    (new URLSearchParams(window.location.search).get("client") || "").trim()
  ).current;
  // mobile accordion: which call is expanded inline (null = all collapsed)
  const [mobileOpenId, setMobileOpenId] = useState(null);
  // "log" | "archive" | "trash" — archived_at / deleted_at drive the split
  const [view, setView] = useState("log");
  const scrollTargetId = React.useRef(null);
  const rptNum = React.useRef(Math.floor(Math.random()*9000)+1000).current;

  function toggleMobile(call) {
    // one open at a time; tapping the open row closes it
    setMobileOpenId(prev => prev === call.id ? null : call.id);
    setSelected(call);
    scrollTargetId.current = call.id;
  }

  // After an expand or collapse, bring that row's header to the top of the
  // viewport. Runs post-commit so the inline report has already laid out.
  useEffect(() => {
    const id = scrollTargetId.current;
    if (id === null) return;
    scrollTargetId.current = null;
    const row = document.getElementById(`lr-row-${id}`);
    if (!row) return;
    requestAnimationFrame(() => {
      const nav = document.querySelector(".lr-nav");
      // measure rather than assume: the lockup wraps at small widths, and a
      // hardcoded height would leave the row tucked under the sticky bar
      const NAV = nav ? nav.getBoundingClientRect().height : 56;
      const y = window.scrollY !== undefined ? window.scrollY : window.pageYOffset;
      // Put the tapped row itself just below the nav, so the row stays on
      // screen with its report opening directly beneath it. An earlier version
      // clamped this to the day header above the row — but that header is
      // always higher up the page, so the clamp always won and every tap
      // scrolled to the top of the group instead of to the row.
      const top = y + row.getBoundingClientRect().top - NAV;
      window.scrollTo({top: Math.max(0, top), behavior:"smooth"});
    });
  }, [mobileOpenId]);

  // The open report's blueprint image, fetched on demand since the list no
  // longer carries it. Keyed by id and remembered, so re-opening a call does not
  // re-download; the ref tracks what has been asked for so a slow request is not
  // fired twice.
  const [images, setImages] = useState({});
  const imgAsked = React.useRef(new Set());
  useEffect(() => {
    const id = selected?.id;
    if (!id || imgAsked.current.has(id)) return;
    imgAsked.current.add(id);
    let live = true;
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?select=image_url&id=eq.${id}`, {
      cache: "no-store",
      headers: {apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`}
    })
    .then(r => r.ok ? r.json() : null)
    .then(rows => { if (live) setImages(m => ({...m, [id]: (rows && rows[0] && rows[0].image_url) || null})); })
    .catch(() => { if (live) setImages(m => ({...m, [id]: null})); });
    return () => { live = false; };
  }, [selected?.id]);

  // Soft archive/delete/restore. Optimistic in state, reverted if the PATCH
  // fails — nothing is destroyed, both columns are timestamps that can be
  // nulled again from the Archive and Trash views.
  const patchCall = React.useCallback((call, patch) => {
    const before = call;
    setCalls(cs => cs.map(c => c.id===call.id ? {...c, ...patch} : c));
    // the row is leaving whichever view we are in, so drop any selection on it
    setSelected(sel => sel && sel.id===call.id ? null : sel);
    setMobileOpenId(id => id===call.id ? null : id);
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?id=eq.${call.id}`, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(patch)
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
    .catch(() => { setCalls(cs => cs.map(c => c.id===call.id ? before : c)); });
  }, []);

  const archiveCall = React.useCallback(c => patchCall(c, {archived_at: new Date().toISOString()}), [patchCall]);
  const deleteCall  = React.useCallback(c => patchCall(c, {deleted_at:  new Date().toISOString()}), [patchCall]);
  // Restore undoes one stage, not the whole journey. Archiving and deleting are
  // separate decisions, so undoing the delete leaves the archive decision alone:
  // a row archived before it was deleted returns to Archive, and one that went
  // straight from the log to Trash returns to the log, since archived_at was
  // never set on it.
  const restoreCall = React.useCallback(
    c => patchCall(c, view==="trash" ? {deleted_at:null} : {archived_at:null}),
    [patchCall, view]);

  // Permanently removes one row. Guarded by an in-place confirm on the button
  // itself, since it is the one action with nothing to undo it.
  const hardDeleteCall = React.useCallback(call => {
    const before = calls;
    setCalls(cs => cs.filter(c => c.id !== call.id));
    setSelected(sel => sel && sel.id===call.id ? null : sel);
    setMobileOpenId(id => id===call.id ? null : id);
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?id=eq.${call.id}`, {
      method: "DELETE",
      cache: "no-store",
      headers: {apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Prefer: "return=minimal"}
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
    .catch(() => { setCalls(before); });
  }, [calls]);

  // Clears the whole of Trash. Everything else is a timestamp that can be
  // nulled again; this removes the rows. Guarded by the two-step confirm on the
  // Empty trash control.
  const emptyTrash = React.useCallback(() => {
    const before = calls;
    if (!calls.some(c => c.deleted_at)) return;
    setCalls(cs => cs.filter(c => !c.deleted_at));
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?client_id=eq.${encodeURIComponent(clientId)}&deleted_at=not.is.null`, {
      method: "DELETE",
      cache: "no-store",
      headers: {apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Prefer: "return=minimal"}
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); })
    .catch(() => { setCalls(before); });
  }, [calls, clientId]);

  // One set per view, both platforms. Every action lives in the reveal — a row
  // shows no buttons until it is asked to, whichever view it is in.
  const rowActions =
      view === "log"     ? [{label:"Archive", cls:"arch", run:archiveCall}]
    : view === "archive" ? [{label:"Restore", cls:"rest", run:restoreCall},
                            {label:"Delete",  cls:"del",  run:deleteCall}]
    :                      [{label:"Restore", cls:"rest", run:restoreCall},
                            {label:"Delete forever", cls:"del wide", run:hardDeleteCall,
                             confirm:"Confirm delete?"}];

  const loadCalls = React.useCallback(() => {
    // No tenant, no request.
    if (!clientId) { setStatus("no-client"); return; }
    setStatus("loading"); setFailure(null);
    const clear = () => { setCalls([]); setSelected(null); setMobileOpenId(null); };
    // iOS Safari can leave a request pending indefinitely on a flaky connection
    // rather than rejecting, which strands the app on the loading screen.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    // Measured so a failure can say how far it got. A timeout with no numbers
    // attached is indistinguishable from a dead network, which cost an hour
    // once already — the payload was the problem and nothing said so.
    const t0 = Date.now();
    let received = 0;
    // Everything except image_url. Those hold base64 data: URIs — ~296KB a row,
    // 14.4MB of a 14.8MB response for 50 rows — and only the one open report can
    // show one. Pulling them all made the list time out on any mobile connection.
    // The open report fetches its own image below.
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?select=${LIST_COLS}&client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=50`, {
      signal: ctl.signal,
      cache: "no-store",              // iOS Safari serves stale cached failures aggressively
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`
      }
    })
    // Read the body as a stream rather than with .json(), so bytes are counted
    // as they land and survive an abort part-way through.
    .then(async r => {
      let text = "";
      if (r.body && r.body.getReader) {
        const reader = r.body.getReader(), dec = new TextDecoder();
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          received += value.length;
          text += dec.decode(value, {stream:true});
        }
        text += dec.decode();
      } else {
        text = await r.text();                 // no streams: count what arrived
        received = text.length;
      }
      let body = null;
      try { body = JSON.parse(text); } catch (e) {}
      return {ok: r.ok, http: r.status, body};
    })
    .then(({ok, http, body}) => {
      clearTimeout(timer);
      // PostgREST answers a failure with 4xx and a JSON error object, which
      // parses cleanly. Without this check it reaches the zero-rows branch and
      // an auth, RLS or bad-client_id failure renders as "No calls yet".
      if (!ok || !Array.isArray(body)) {
        clear();
        const message = (body && body.message) || `HTTP ${http}`;
        const code = (body && body.code) || "";
        setFailure({
          kind: isAuthFailure(http, code, message) ? "auth" : "api",
          http,
          message,
          code,
          details: (body && body.details) || "",
          hint: (body && body.hint) || "",
          ms: Date.now() - t0,
          bytes: received
        });
        setStatus("error");
        return;
      }
      // rows arrive created_at.desc, so rows[0] is the newest — auto-expand it
      // on mobile so the latest report is visible without a tap
      if (body.length > 0) { setCalls(body); setSelected(body[0]); setMobileOpenId(body[0].id); }
      else { setCalls([]); setSelected(null); setMobileOpenId(null); }
      setStatus("ready");
    })
    .catch(err => {
      clearTimeout(timer);
      const timedOut = ctl.signal.aborted;
      clear();
      setFailure({
        kind: timedOut ? "timeout" : "network",
        message: timedOut ? "Request timed out after 15s" : ((err && err.message) || String(err)),
        code: "", details: "", hint: "",
        ms: Date.now() - t0,
        bytes: received
      });
      setStatus("error");
    });
  }, [clientId]);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  function handleGenerate() {
    try {
      const parsed = JSON.parse(jsonInput);
      const newCall = { id:Date.now(), created_at:new Date().toISOString(), caller_name:parsed.lead?.name||"Unknown", image_url:null, report_json:parsed };
      setCalls(prev => [newCall, ...prev]);
      setSelected(newCall); setMobileOpenId(newCall.id);
      setError(""); setStatus("ready"); setShowInput(false); setJsonInput("");
    } catch(e) { setError("Invalid JSON — check the format and try again."); }
  }

  if (status === "loading") return (
    <div style={{background:"#0b1014",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:"monospace",fontSize:11,color:"#c89456",letterSpacing:2}}>LOADING CALLS...</span>
    </div>
  );

  // Archived and deleted rows leave the main log; each has its own view.
  // Deleting from Archive sets deleted_at but leaves archived_at, so an archive
  // predicate of "archived_at is set" kept the row here and showed it in Trash
  // at the same time. Trash outranks Archive: a deleted row is only ever in Trash.
  const visibleCalls = calls.filter(c =>
      view === "archive" ? (!!c.archived_at && !c.deleted_at)
    : view === "trash"   ? !!c.deleted_at
    : !c.archived_at && !c.deleted_at);

  const sidebar = (
    <>
      <div className="lr-sidebar-nav">
        <BrandLockup uid="sidebar"/>
      </div>
      <CallLog calls={visibleCalls} selectedId={selected?.id} view={view} onViewChange={setView}
        onEmptyTrash={emptyTrash} rowActions={rowActions}
        onSelect={c=>{setSelected(c);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"})}}/>
    </>
  );

  // Resolved once so the mobile and desktop panes cannot disagree. null means
  // there is real data to render.
  const stateCard =
      status === "no-client" ? <NoClientState/>
    : status === "error"     ? <LoadErrorState clientId={clientId} failure={failure} onRetry={loadCalls}/>
    : calls.length === 0      ? <EmptyState/>
    : null;

  const main = (
    <>
      <nav className="lr-nav">
        <BrandLockup uid="nav" w={26} h={30}/>
        <div className="lr-nav-badge">
          <span className="lr-live-dot"/>
          <span className="lr-mono" style={{fontSize:9,letterSpacing:1.5,color:"#5cb083",textTransform:"uppercase",fontWeight:700}}>Live</span>
        </div>
      </nav>

      <div className="lr-tools" style={{padding:"8px 16px",borderBottom:"1px solid #21303b",background:"#0d141b"}}>
        <button className="gen-btn lr-mono" onClick={()=>setShowInput(v=>!v)} style={{fontSize:9}}>
          {showInput?"▲ Hide":"▼ Paste JSON"}
        </button>
        {showInput && (
          <div style={{marginTop:8}}>
            <textarea className="json-area" placeholder="Paste raw JSON…" value={jsonInput} onChange={e=>setJsonInput(e.target.value)}/>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button className="gen-btn" onClick={handleGenerate} style={{fontSize:9}}>Generate →</button>
              <button className="gen-btn" style={{opacity:.6,fontSize:9}} onClick={()=>{setCalls(SAMPLE_CALLS);setSelected(SAMPLE_CALLS[0]);setMobileOpenId(SAMPLE_CALLS[0].id);setJsonInput("");setError("");setStatus("ready");}}>Sample</button>
            </div>
            {error && <div className="err-box">{error}</div>}
          </div>
        )}
      </div>

      {/* MOBILE: the whole page — day groups, call rows, report inline.
          Hidden at >=768px, where the sidebar log + report pane take over. */}
      <div className="lr-log-mobile">
        {stateCard
          ? <div className="lr-mobile-state">{stateCard}</div>
          : <CallLog calls={visibleCalls} accordion expandedId={mobileOpenId}
              view={view} onViewChange={setView}
              rowActions={rowActions}
              onEmptyTrash={emptyTrash} images={images}
              onToggle={toggleMobile} rptNum={rptNum}/>}
      </div>

      {/* DESKTOP: report pane. Hidden at <=767px. */}
      <div className="lr-report">
        {stateCard || (selected && <Report call={selected} rptNum={rptNum} imageUrl={images[selected.id]}/>)}
      </div>
    </>
  );

  return (
    <div className="lr-app">
      <style>{css}</style>
      <div className="lr-layout">
        <div className="lr-sidebar">{sidebar}</div>
        <div className="lr-main">{main}</div>
      </div>
    </div>
  );
}
