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

// Words safe to drop from the end of a cut phrase — a summary ending in
// "into the" reads as broken, one ending in "ceiling" reads as complete.
const DANGLING_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","of","for","with",
  "into","from","over","under","by","is","are","was","has","had","their",
  "this","that","its","getting","being","be","been","will","would","can",
  "could","should","near","about","very","really"
]);

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

// Where a sentence can be cut and still read as a finished thought: the end
// of a sentence or clause, or just before a word that opens a new one. A cut
// anywhere else ("…researching pricing and founder") leaves the reader hanging
// mid-idea, which is what makes a shortened line feel truncated even when no
// character is visibly missing.
const CLAUSE_OPENERS = /\s+(?:who|whom|whose|which|that|because|since|while|before|after|until|when|where|so|but|and|or|though|although|unless|with|without|plus|then|as)\s+/gi;

// Trailing scraps that add nothing on their own: "…asked for pricing, got it"
// is a grammatically complete sentence that still reads like it trailed off,
// because the last clause carries no information. Dropping it leaves a line
// that both reads finished and says something.
const WEAK_TAIL_WORDS = new Set([
  "got","it","that","this","them","they","those","these","one","ones","so",
  "too","also","well","done","did","same","such","there","here","now","then",
  "as","and","but","which","who"
]);

function trimWeakTail(text) {
  const parts = text.split(/\s*[,—–]\s*/);
  if (parts.length < 2) return text;
  const last = parts[parts.length - 1].trim();
  const words = last.split(/\s+/);
  if (words.length <= 3 && words.every(w => WEAK_TAIL_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")))) {
    const cutAt = text.lastIndexOf(parts[parts.length - 1]);
    const trimmed = text.slice(0, cutAt).replace(/[\s,—–-]+$/, "");
    if (trimmed.length >= 12) return trimmed;
  }
  return text;
}

function clauseCuts(text) {
  const cuts = [];
  const punctuation = /[.;:!?]|\s+[—–]\s+|,/g;
  let m;
  while ((m = punctuation.exec(text)) !== null) cuts.push(m.index);
  CLAUSE_OPENERS.lastIndex = 0;
  while ((m = CLAUSE_OPENERS.exec(text)) !== null) {
    cuts.push(m.index);
    CLAUSE_OPENERS.lastIndex = m.index + 1;   // allow overlapping matches
  }
  return cuts.sort((a, b) => a - b);
}

// Shorten to something that reads as a complete thought rather than a cut-off
// one. Priority reasons come through in two shapes: "·"-joined fragments and
// ordinary prose sentences. Fragments keep whole segments; prose keeps the
// longest leading clause that fits, so "This is a warm inbound prospect who
// already uses a competitor" becomes "This is a warm inbound prospect" instead
// of stopping mid-clause. No ellipsis — a visible "…" reads as truncation to
// the person triaging. Full text stays in the report and the title attribute.
function summarizeReason(reason, maxChars) {
  if (!reason) return "";
  // an informationless tail reads as trailing off whether the generator wrote
  // it that way or a clause cut landed there, so strip it in both cases
  if (reason.length <= maxChars) return trimWeakTail(reason);

  if (reason.includes("·")) {
    const segs = reason.split("·").map(s => s.trim()).filter(Boolean);
    let out = "";
    for (const seg of segs) {
      const next = out ? `${out} · ${seg}` : seg;
      if (next.length > maxChars) break;
      out = next;
    }
    if (out) return out;
  }

  // longest leading clause that fits — the most information that still lands
  // on a natural stopping point
  const fitting = clauseCuts(reason).filter(i => i > 0 && i <= maxChars);
  if (fitting.length) {
    const clause = reason.slice(0, fitting[fitting.length - 1]).trim()
      .replace(/[,;:—–-]+$/, "").trim();
    if (clause.length >= 12) return trimWeakTail(clause);
  }

  // no natural break in range: cut at a word boundary and drop trailing
  // connectives so the phrase at least doesn't end mid-thought
  const cut = reason.slice(0, maxChars);
  const sp = cut.lastIndexOf(" ");
  const words = (sp > maxChars * 0.6 ? cut.slice(0, sp) : cut).trimEnd().split(/\s+/);
  while (words.length > 1 && DANGLING_WORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(" ");
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
  .lr-log-group-hdr{display:flex;align-items:center;gap:7px;width:100%;padding:6px 2px;background:none;border:none;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .lr-log-group-hdr .lr-log-group-label{margin:0}
  .lr-log-caret{display:inline-block;font-size:7px;color:#56697b;transform:rotate(0deg);transition:transform .18s ease;flex-shrink:0}
  .lr-log-caret.open{transform:rotate(90deg)}
  .lr-log-count{margin-left:auto;font-size:8px;letter-spacing:1px;color:#56697b;flex-shrink:0}
  .lr-log-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #21303b;border-radius:3px;background:#141d25;margin-bottom:4px;cursor:pointer;transition:border-color .15s}
  .lr-log-item:hover{border-color:#2b3a47}
  .lr-log-item.active{border-color:#c89456;background:rgba(200,148,86,.06)}
  .lr-log-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .lr-log-name{font-size:11px;color:#eef3f7;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-log-problem{font-size:10px;color:#aebfcc;flex:1.2;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-log-time{font-size:9px;color:#56697b;flex-shrink:0}
  /* Inert on desktop: display:contents keeps the sidebar row a single flex
     line of dot / name / problem / time / chevron, exactly as before. */
  .lr-log-main{display:contents}
  .lr-log-lbl{display:none}
  .lr-log-pri{display:none}
  .lr-log-tier{display:none}
  .lr-log-reason{display:none}
  .lr-log-chevron{font-size:10px;color:#56697b;flex-shrink:0}
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
  .box{background:#141d25;border:1px solid #21303b;border-radius:3px;padding:.75rem;margin-bottom:8px}
  .box:last-child{margin-bottom:0}
  .lr-day{width:18px;height:18px;border-radius:2px;display:flex;align-items:center;justify-content:center;border:1px solid #21303b;background:#0d141b}
  .lr-day .dl{font-size:7px;color:#56697b;font-weight:700;line-height:1}
  .lr-day.on{background:rgba(200,148,86,.2);border-color:#c89456}
  .lr-day.on .dl{color:#e6b074}
  .lr-tier{display:flex;align-items:center;gap:6px;padding:3px 7px;border-radius:3px;border:1px solid #21303b;background:#0d141b;opacity:.35;margin-bottom:3px}
  .lr-tier.active{opacity:1;border-left-width:3px}
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
  .rpt-note{font-size:clamp(8px,2.2vw,9px)}
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
    .lr-layout{display:grid;grid-template-columns:300px 1fr;min-height:100vh}
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
    .rpt-lead-section{border-left:3px solid #c89456;order:1}
    .rpt-priority{order:2}
    .rpt-story-section{order:3}
    .rpt-callback{order:4}
    .rpt-problem{order:5}
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
    .lr-tier .tn{font-size:10px}
    .lr-tier .tr{font-size:10px}
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
    .rpt-note{font-size:14px}
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
    .lr-inline-report{margin:8px 0 12px}
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

    .lr-log-item.open{border-color:#c89456;background:rgba(200,148,86,.06)}
    .lr-log-item.open .lr-log-chevron{transform:translateY(-50%) rotate(90deg)}

    /* call log as stacked cards */
    .lr-log-group-hdr{padding:10px 2px}
    .lr-log-group-label{font-size:10px}
    .lr-log-caret{font-size:9px}
    .lr-log-count{font-size:10px}
    .lr-log-item{display:flex;align-items:center;gap:10px;position:relative;
      padding:11px 26px 11px 14px;margin-bottom:6px}
    .lr-log-main{display:block;flex:1 1 auto;min-width:0}
    .lr-log-lbl{display:block;font-size:9px;letter-spacing:1px;color:#56697b;
      text-transform:uppercase;line-height:1;margin-bottom:3px}
    /* priority: right column, centred stack — tier pill over its reason.
       ~45% so the reason has room to wrap instead of being clipped to a stub. */
    .lr-log-pri{display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:6px;flex:0 0 45%;max-width:45%;margin-left:4px;text-align:center}
    /* pill: tier colour at full strength on the same colour at 15%, both set
       inline from TIER_DOT_COLORS */
    .lr-log-tier{display:inline-block;font-size:11px;letter-spacing:.08em;font-weight:500;
      text-transform:uppercase;line-height:1.2;padding:4px 10px;border-radius:4px}
    /* max-height caps the clamp: with a centred flex parent some engines let a
       -webkit-box grow past its line-clamp when the row is tall enough. The
       +3px buffer keeps rounding from vertically slicing the third line. */
    .lr-log-reason{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;
      overflow:hidden;width:100%;text-align:center;font-size:12px;color:#82a0ba;
      line-height:1.35;white-space:normal;overflow-wrap:break-word;
      max-height:calc(12px * 1.35 * 4 + 3px)}
    .lr-log-item::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:2px 0 0 2px;background:var(--tier,#82a0ba)}
    .lr-log-dot{display:none}
    .lr-log-name{display:block;font-size:15px;font-weight:600;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;margin-bottom:8px}
    .lr-log-problem{display:block;font-size:13px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35;margin-bottom:8px}
    .lr-log-time{display:block;font-size:11px;line-height:1.2}
    .lr-log-chevron{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:15px;transition:transform .18s ease}
  }
  .gen-btn{background:rgba(200,148,86,.12);border:1px solid #c89456;color:#e6b074;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:2px;cursor:pointer}
  .gen-btn:hover{background:rgba(200,148,86,.22)}
  .json-area{width:100%;height:160px;background:#0b1014;color:#82a0ba;border:1px solid #2b3a47;border-radius:3px;padding:10px;font-family:monospace;font-size:10px;resize:vertical;outline:none}
  .json-area:focus{border-color:#c89456}
  .err-box{background:rgba(220,91,78,.12);border:1px solid rgba(220,91,78,.4);color:#f0a59b;font-family:monospace;font-size:10px;padding:8px 12px;border-radius:2px;margin-top:6px}
  .ai-img-label{font-family:'DejaVu Sans Mono',monospace;font-size:7px;letter-spacing:1.5px;color:#4a7a9b;text-transform:uppercase;text-align:center;margin-top:5px;opacity:.7}
`;

function CallLogItem({ call, isActive, expanded, rowId, onClick }) {
  const tier = call.report_json?.priority?.tier || "Standard";
  const dot = TIER_DOT_COLORS[tier] || "#82a0ba";
  const problem = call.report_json?.problem?.title || "Unknown";
  const d = call.report_json || {};
  const fullReason = d.priority?.reason || "";
  // Show why this tier was chosen, not the problem again — the problem
  // already owns the column to the left. Anything the reason shares with it
  // is dropped; if that empties the field, the dispatch note's urgency
  // clause stands in, since it explains the same decision.
  // a segment that was mid-string ("… · elderly resident") leads the box once
  // the parts before it are dropped, so it needs a capital to read as a phrase
  const justification = (distinctReason(fullReason, d.problem) || fallbackJustification(d))
    .replace(/^[a-z]/, c => c.toUpperCase());
  // The column is 45% of the row; on a narrow phone that's ~17 chars per 12px
  // line. The left column (caller / reason / received) always runs taller than
  // this one, so a 4th line costs no row height and buys ~65 chars — enough
  // for a whole opening clause rather than a fragment of one.
  const reason = summarizeReason(justification, 65);
  return (
    <div id={rowId} className={`lr-log-item${isActive?" active":""}${expanded?" open":""}`}
      style={{"--tier":dot}} onClick={onClick}
      role={rowId?"button":undefined} aria-expanded={rowId?!!expanded:undefined}>
      <span className="lr-log-dot" style={{background:dot,boxShadow:isActive?`0 0 5px ${dot}`:undefined}}/>
      {/* display:contents on desktop, so the sidebar row stays the same flex line */}
      <div className="lr-log-main">
        <span className="lr-log-lbl lr-mono">Caller</span>
        <span className="lr-log-name lr-mono">{call.caller_name||"Unknown"}</span>
        <span className="lr-log-lbl lr-mono">Reason for call</span>
        <span className="lr-log-problem">{problem}</span>
        <span className="lr-log-lbl lr-mono">Received</span>
        <span className="lr-log-time lr-mono">{fmtTime(call.created_at)}</span>
      </div>
      {/* mobile only — priority pulled out to the right of the row */}
      <div className="lr-log-pri">
        <span className="lr-log-tier lr-mono"
          style={{color:dot,background:`rgba(${hexToRgb(dot)},.15)`}}>{tier}</span>
        {reason && <span className="lr-log-reason" title={fullReason}>{reason}</span>}
      </div>
      <span className="lr-log-chevron">›</span>
    </div>
  );
}

// Two modes, one component so the grouping and day-collapse logic stays shared:
//  - default (desktop sidebar): rows select, the report lives in its own pane
//  - accordion (mobile): rows toggle, the report renders inline under the open row
function CallLog({ calls, selectedId, onSelect, accordion=false, expandedId=null, onToggle, rptNum }) {
  // date label -> bool. Absent = use the default (Today open, everything else collapsed).
  const [openOverrides, setOpenOverrides] = useState({});
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
      <div className="lr-log-label lr-mono">{calls.length} rescued call{calls.length!==1?"s":""}</div>
      {groups.map(([date, items]) => {
        const hasCurrent = items.some(c => c.id === currentId);
        const userOpen = openOverrides[date] !== undefined ? openOverrides[date] : date === "Today";
        // a group holding the current call is always shown, whatever the toggle says
        const open = hasCurrent || userOpen;
        return (
          <div key={date} className="lr-log-group">
            <button
              type="button"
              className="lr-log-group-hdr"
              aria-expanded={open}
              onClick={()=>setOpenOverrides(prev => ({...prev, [date]: !open}))}
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
                    isActive={isCurrent}
                    expanded={accordion && isCurrent}
                    // id only in accordion mode — the desktop log renders the same
                    // calls, and duplicate DOM ids would break the scroll target
                    rowId={accordion ? `lr-row-${c.id}` : undefined}
                    onClick={()=> accordion ? onToggle(c) : onSelect(c)}
                  />
                  {accordion && isCurrent && (
                    <div className="lr-inline-report">
                      <Report call={c} rptNum={rptNum}/>
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

function LoadErrorState() {
  return (
    <div className="lr-card" style={{borderColor:"rgba(220,91,78,.4)"}}>
      <div className="lr-grid-bg"/>
      <div className="lr-pad" style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:4,padding:"40px 20px"}}>
        <div className="lr-mono fs-9" style={{letterSpacing:2,color:"#f0a59b",textTransform:"uppercase"}}>Connection error</div>
        <div className="lr-serif lr-empty-title" style={{marginTop:6}}>Couldn't load your calls</div>
        <div className="lr-empty-body">We couldn't reach the call log just now. Check your connection and refresh — nothing has been lost.</div>
      </div>
    </div>
  );
}

function Report({ call, rptNum }) {
  const d = call.report_json || {};
  const tier = d.priority?.tier || "Standard";
  const tc = TIER_COLORS[tier] || TIER_COLORS.Standard;
  const days = d.callback?.days || [];
  const addrParts = (d.lead?.address_line2||"").split(",");
  const city = addrParts[0]?.trim()||"";
  const stateZip = addrParts.slice(1).join(",").trim()||"";
  const imageUrl = call.image_url || null;

  return (
    <div className="lr-card">
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
          <div className="box rpt-left" style={{borderLeft:"3px solid #c89456",marginBottom:0}}>
           <div className="box rpt-lead-section">
            <div className="rpt-lead-top">
              {/* mobile only — mirrors the header meta the mobile view drops.
                  Comes first so the name/descriptor flow around the float. */}
              <div className="rpt-lead-meta lr-mono fs-8">
                <div>Case <span style={{color:"#aebfcc"}}>#{rptNum}</span></div>
                <div>Recv <span style={{color:"#aebfcc"}}>{fmtRecv(call.created_at)}</span></div>
              </div>
              <div className="rpt-lead-head">
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",border:"1px solid #c89456",background:"rgba(200,148,86,.1)",borderRadius:2,marginBottom:6}}>
                  <span style={{width:4,height:4,borderRadius:"50%",background:"#e6b074",display:"inline-block"}}/>
                  <span className="lr-mono fs-75" style={{letterSpacing:2,color:"#e6b074",textTransform:"uppercase",fontWeight:700}}>New Lead</span>
                </div>
                <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(18px,5vw,24px)",color:"#eef3f7",lineHeight:1,marginBottom:2}}>{d.lead?.name||"Unknown"}</div>
                <div className="lr-mono fs-75" style={{letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginBottom:6}}>{d.lead?.descriptor||""}</div>
              </div>
            </div>
            <div className="div-h"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px",marginTop:".3rem",marginBottom:".6rem"}}>
              {[
                {icon:"device-mobile",label:"Phone",val:d.lead?.phone},
                {icon:"message-dots",label:"Preferred contact",val:d.lead?.preferred_contact},
                {icon:"at",label:"Email",val:d.lead?.email},
                {icon:"antenna",label:"How they found you",val:d.lead?.how_found},
              ].map(({icon,label,val})=>(
                <div key={label}>
                  <span className="field-lbl lr-mono">{label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <Icon name={icon} className="field-icon" style={{color:"#56697b"}}/>
                    <span className="field-val lr-mono">{val||"Not provided"}</span>
                  </div>
                </div>
              ))}
              <div style={{gridColumn:"1 / -1"}}>
                <span className="field-lbl lr-mono">Service address</span>
                <div style={{display:"flex",alignItems:"flex-start",gap:4}}>
                  <Icon name="map-pin" className="field-icon" style={{color:"#56697b",marginTop:1}}/>
                  <div>
                    <div className="field-val lr-mono">{d.lead?.address_line1||"Not provided"}</div>
                    <div className="field-val-dim lr-mono">{city}</div>
                    <div className="field-val-dim lr-mono">{stateZip}</div>
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

            {/* Callback */}
            <div className="box rpt-callback" style={{marginBottom:0}}>
              <div className="sec-title lr-mono"><Icon name="clock"/> Best callback window</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div className="lr-mono" style={{fontSize:"clamp(14px,4vw,18px)",color:"#e6b074",fontWeight:700,lineHeight:1}}>{d.callback?.time||"Anytime"}</div>
                <div className="lr-mono fs-75" style={{color:"#56697b",letterSpacing:1,textTransform:"uppercase"}}>{d.callback?.period||""}</div>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:5}}>
                {DAY_KEYS.map((dk,i)=>{
                  const on = isDayActive(dk,days);
                  return <div key={dk} className={`lr-day lr-mono${on?" on":""}`}><span className="dl">{DAY_LABELS[i]}</span></div>;
                })}
              </div>
              <div className="rpt-note" style={{lineHeight:1.5,padding:"4px 6px",background:"#0d141b",border:"1px solid #21303b",borderRadius:2}}>
                <span style={{color:"#eef3f7",fontWeight:700}}>"{d.callback?.note||""}"</span>
              </div>
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
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  // mobile accordion: which call is expanded inline (null = all collapsed)
  const [mobileOpenId, setMobileOpenId] = useState(null);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client") || "demo-client";
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?select=*&client_id=eq.${clientId}&order=created_at.desc&limit=50`, {
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8",
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8`
      }
    })
    .then(r => r.json())
    .then(rows => {
      // rows arrive created_at.desc, so rows[0] is the newest — auto-expand it
      // on mobile so the latest report is visible without a tap
      if (rows && rows.length > 0) { setCalls(rows); setSelected(rows[0]); setMobileOpenId(rows[0].id); }
      else { setCalls([]); setSelected(null); setMobileOpenId(null); }
      setLoading(false);
    })
    .catch(() => { setCalls([]); setSelected(null); setMobileOpenId(null); setLoadError(true); setLoading(false); });
  }, []);

  function handleGenerate() {
    try {
      const parsed = JSON.parse(jsonInput);
      const newCall = { id:Date.now(), created_at:new Date().toISOString(), caller_name:parsed.lead?.name||"Unknown", image_url:null, report_json:parsed };
      setCalls(prev => [newCall, ...prev]);
      setSelected(newCall); setMobileOpenId(newCall.id);
      setError(""); setLoadError(false); setShowInput(false); setJsonInput("");
    } catch(e) { setError("Invalid JSON — check the format and try again."); }
  }

  if (loading) return (
    <div style={{background:"#0b1014",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:"monospace",fontSize:11,color:"#c89456",letterSpacing:2}}>LOADING CALLS...</span>
    </div>
  );

  const sidebar = (
    <>
      <div className="lr-sidebar-nav">
        <BrandLockup uid="sidebar"/>
      </div>
      <CallLog calls={calls} selectedId={selected?.id} onSelect={c=>{setSelected(c);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"})}}/>
    </>
  );

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
              <button className="gen-btn" style={{opacity:.6,fontSize:9}} onClick={()=>{setCalls(SAMPLE_CALLS);setSelected(SAMPLE_CALLS[0]);setMobileOpenId(SAMPLE_CALLS[0].id);setJsonInput("");setError("");setLoadError(false);}}>Sample</button>
            </div>
            {error && <div className="err-box">{error}</div>}
          </div>
        )}
      </div>

      {/* MOBILE: the whole page — day groups, call rows, report inline.
          Hidden at >=768px, where the sidebar log + report pane take over. */}
      <div className="lr-log-mobile">
        {loadError
          ? <div className="lr-mobile-state"><LoadErrorState/></div>
          : calls.length === 0
            ? <div className="lr-mobile-state"><EmptyState/></div>
            : <CallLog calls={calls} accordion expandedId={mobileOpenId}
                onToggle={toggleMobile} rptNum={rptNum}/>}
      </div>

      {/* DESKTOP: report pane. Hidden at <=767px. */}
      <div className="lr-report">
        {loadError
          ? <LoadErrorState/>
          : calls.length === 0
            ? <EmptyState/>
            : selected && <Report call={selected} rptNum={rptNum}/>}
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
