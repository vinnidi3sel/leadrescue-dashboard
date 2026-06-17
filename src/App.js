import React, { useState } from 'react';
import { useState } from 'react';

const SAMPLE = {
  lead: {
    name: 'Margaret Reyes',
    descriptor: 'Homeowner · New customer · El Dorado Hills',
    phone: '(916) 555-0148',
    preferred_contact: 'Call or text',
    email: 'mreyes@gmail.com',
    address_line1: '1142 Oak Ridge Dr',
    address_line2: 'El Dorado Hills, CA 95762',
    how_found: 'Google — "AC repair near me"',
  },
  priority: {
    tier: 'Urgent',
    reason: 'Heat advisory · elderly resident · getting worse',
  },
  callback: {
    time: '4–6 PM',
    period: 'Afternoon',
    days: ['Tue'],
    note: 'Reach her today — "after 4 is best, I\'m home from work by then"',
  },
  recap:
    "Margaret called the main line at 2:14 PM; it rang out and Voice AI answered. She described it plainly — <q>my air conditioner's running but it's just blowing warm air</q> — and added <q>it started this morning and now the house is up to 84 degrees.</q> She raised the urgency herself: <q>my mom lives with me, she's elderly, and this heat is really hard on her.</q> When asked the best way to reach her, she said <q>call or text is fine, but after 4 is best — I'm home from work by then.</q>",
  tone_read:
    "Anxious and direct — this isn't a price-shopper. She's high-intent and time-sensitive, and named the urgency herself before being asked. Treat as same-day: call back at the top of the 4–6 PM window and open with soonest availability, not pricing.",
  problem: {
    title: 'A/C Not Cooling',
    detail: 'Running but blowing warm air · 84°F indoor · started this morning',
    quote: "it's just blowing warm air",
  },
};

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TIERS = ['Emergency', 'Urgent', 'Standard', 'Quote'];
const TIER_COLORS = {
  Emergency: {
    border: '#dc5b4e',
    bg: 'rgba(220,91,78,.12)',
    dot: '#dc5b4e',
    text: '#f0a59b',
  },
  Urgent: {
    border: '#e2884a',
    bg: 'rgba(226,136,74,.12)',
    dot: '#e2884a',
    text: '#f3c59c',
  },
  Standard: {
    border: '#82a0ba',
    bg: 'rgba(130,160,186,.12)',
    dot: '#82a0ba',
    text: '#bcd0e0',
  },
  Quote: {
    border: '#7c8e9c',
    bg: 'rgba(124,142,156,.1)',
    dot: '#7c8e9c',
    text: '#aebfcc',
  },
};

const PERIOD_ICON = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    stroke="#e6b074"
    strokeWidth="1.1"
    strokeLinecap="round"
  >
    <circle cx="6" cy="6" r="2.4" />
    <line x1="6" y1="1" x2="6" y2="2.4" />
    <line x1="6" y1="9.6" x2="6" y2="11" />
    <line x1="1" y1="6" x2="2.4" y2="6" />
    <line x1="9.6" y1="6" x2="11" y2="6" />
    <line x1="2.5" y1="2.5" x2="3.4" y2="3.4" />
    <line x1="8.6" y1="8.6" x2="9.5" y2="9.5" />
    <line x1="2.5" y1="9.5" x2="3.4" y2="8.6" />
    <line x1="8.6" y1="3.4" x2="9.5" y2="2.5" />
  </svg>
);

const MOON_ICON = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    stroke="#e6b074"
    strokeWidth="1.1"
    strokeLinecap="round"
  >
    <path d="M10 7.5A5 5 0 0 1 4.5 2a5 5 0 1 0 5.5 5.5z" />
  </svg>
);

const NIGHT_ICON = (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    stroke="#e6b074"
    strokeWidth="1.1"
    strokeLinecap="round"
  >
    <circle cx="6" cy="6" r="2.8" />
    <line x1="6" y1="1" x2="6" y2="2.2" />
    <line x1="6" y1="9.8" x2="6" y2="11" />
    <line x1="1" y1="6" x2="2.2" y2="6" />
    <line x1="9.8" y1="6" x2="11" y2="6" />
  </svg>
);

function periodIcon(p) {
  if (!p) return PERIOD_ICON;
  const lp = p.toLowerCase();
  if (lp === 'evening' || lp === 'night') return MOON_ICON;
  if (lp === 'morning') return NIGHT_ICON;
  return PERIOD_ICON;
}

function isDayActive(dayKey, days) {
  if (!days || days.length === 0) return false;
  const lk = dayKey.toLowerCase();
  return days.some((d) => {
    const ld = d.toLowerCase();
    if (ld === 'today' || ld === 'anytime') return true;
    if (ld === 'weekdays' && ['mon', 'tue', 'wed', 'thu', 'fri'].includes(lk))
      return true;
    if (ld === 'weekend' && ['sat', 'sun'].includes(lk)) return true;
    return ld.startsWith(lk.slice(0, 2)) || lk.startsWith(ld.slice(0, 2));
  });
}

function isTodayKey(dayKey, days) {
  if (!days) return false;
  return days.some((d) => d.toLowerCase() === 'today') && dayKey === 'Tue';
}

function RecapHtml({ html }) {
  const parts = [];
  let rest = html;
  const re = /<q>(.*?)<\/q>/g;
  let m,
    last = 0;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last)
      parts.push({ type: 'text', val: html.slice(last, m.index) });
    parts.push({ type: 'q', val: m[1] });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ type: 'text', val: html.slice(last) });
  return (
    <p style={{ fontSize: 16, lineHeight: 1.68, color: '#aebfcc', margin: 0 }}>
      {parts.map((p, i) =>
        p.type === 'q' ? (
          <strong key={i} style={{ color: '#eef3f7', fontWeight: 700 }}>
            <span style={{ color: '#c89456' }}>"</span>
            {p.val}
            <span style={{ color: '#c89456' }}>"</span>
          </strong>
        ) : (
          <span key={i}>{p.val}</span>
        )
      )}
    </p>
  );
}

function ShieldLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 46 46" fill="none">
      <path
        d="M23 4 L39.5 10 L39.5 22.5 C39.5 31.5 32 38.5 23 42 C14 38.5 6.5 31.5 6.5 22.5 L6.5 10 Z"
        stroke="#c89456"
        strokeWidth="1.7"
        fill="rgba(200,148,86,0.06)"
        strokeLinejoin="round"
      />
      <path
        d="M11 24 H18 L20 24 L21.6 16.5 L24 31.5 L26.4 21 L28 24 H35"
        stroke="#e6b074"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="35" cy="24" r="1.6" fill="#e6b074" />
    </svg>
  );
}

function ACIllustration() {
  return (
    <svg width="214" height="200" viewBox="0 0 160 160" fill="none">
      <path
        d="M34 32 q7 -10 14 0 t14 0"
        stroke="#e2884a"
        strokeWidth="2.4"
        fill="none"
      />
      <path
        d="M70 28 q7 -10 14 0 t14 0"
        stroke="#e2884a"
        strokeWidth="2.4"
        fill="none"
      />
      <path
        d="M52 18 q7 -10 14 0 t14 0"
        stroke="#e2884a"
        strokeWidth="2"
        fill="none"
        opacity=".7"
      />
      <path
        d="M96 32 q6 -9 12 0 t12 0"
        stroke="#e2884a"
        strokeWidth="2"
        fill="none"
        opacity=".6"
      />
      <rect
        x="20"
        y="48"
        width="104"
        height="100"
        rx="4"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <rect
        x="20"
        y="48"
        width="104"
        height="20"
        fill="#1d2836"
        stroke="#82a0ba"
        strokeWidth="1.6"
      />
      <line x1="30" y1="58" x2="114" y2="58" stroke="#56697b" strokeWidth="1" />
      <circle cx="27" cy="75" r="1.6" fill="#56697b" />
      <circle cx="117" cy="75" r="1.6" fill="#56697b" />
      <circle cx="27" cy="141" r="1.6" fill="#56697b" />
      <circle cx="117" cy="141" r="1.6" fill="#56697b" />
      <circle cx="72" cy="104" r="32" stroke="#82a0ba" strokeWidth="1.6" />
      <circle cx="72" cy="104" r="26" stroke="#56697b" strokeWidth="1" />
      <path
        d="M72 104 Q89 87 99 98 M72 104 Q55 87 45 98 M72 104 Q89 121 99 110 M72 104 Q55 121 45 110 M72 104 Q92 104 98 91 M72 104 Q52 104 46 117"
        stroke="#56697b"
        strokeWidth="1.3"
        fill="none"
      />
      <circle cx="72" cy="104" r="4.5" fill="#c89456" />
      <line x1="29" y1="78" x2="29" y2="138" stroke="#56697b" strokeWidth="1" />
      <line
        x1="33"
        y1="82"
        x2="33"
        y2="134"
        stroke="#56697b"
        strokeWidth=".8"
        opacity=".55"
      />
      <line
        x1="115"
        y1="78"
        x2="115"
        y2="138"
        stroke="#56697b"
        strokeWidth="1"
      />
      <line
        x1="111"
        y1="82"
        x2="111"
        y2="134"
        stroke="#56697b"
        strokeWidth=".8"
        opacity=".55"
      />
      <rect
        x="31"
        y="148"
        width="11"
        height="6"
        fill="#1d2836"
        stroke="#56697b"
        strokeWidth="1"
      />
      <rect
        x="102"
        y="148"
        width="11"
        height="6"
        fill="#1d2836"
        stroke="#56697b"
        strokeWidth="1"
      />
      <rect
        x="140"
        y="46"
        width="9"
        height="60"
        rx="4.5"
        stroke="#82a0ba"
        strokeWidth="1.4"
        fill="#0b1014"
      />
      <circle cx="144.5" cy="114" r="8" fill="#e2884a" />
      <rect x="142" y="78" width="5" height="36" rx="2.5" fill="#e2884a" />
      <line
        x1="151"
        y1="56"
        x2="154"
        y2="56"
        stroke="#56697b"
        strokeWidth="1"
      />
      <line
        x1="151"
        y1="68"
        x2="154"
        y2="68"
        stroke="#56697b"
        strokeWidth="1"
      />
      <line
        x1="151"
        y1="80"
        x2="154"
        y2="80"
        stroke="#56697b"
        strokeWidth="1"
      />
      <circle
        cx="112"
        cy="56"
        r="9.5"
        fill="#0b1014"
        stroke="#e2884a"
        strokeWidth="1.7"
      />
      <path
        d="M112 51 v5.5 M112 59.5 v.6"
        stroke="#e2884a"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlumbingIllustration() {
  return (
    <svg width="214" height="200" viewBox="0 0 160 160" fill="none">
      <rect
        x="60"
        y="20"
        width="14"
        height="60"
        rx="3"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <rect
        x="86"
        y="20"
        width="14"
        height="60"
        rx="3"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <rect
        x="55"
        y="78"
        width="50"
        height="14"
        rx="3"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#1d2836"
      />
      <rect
        x="65"
        y="92"
        width="30"
        height="50"
        rx="3"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <circle cx="80" cy="145" r="8" fill="#378add" opacity=".7" />
      <path
        d="M72 92 q-4 8 -8 20 t-4 18"
        stroke="#378add"
        strokeWidth="2"
        fill="none"
        opacity=".8"
      />
      <path
        d="M88 92 q4 8 8 20 t4 18"
        stroke="#378add"
        strokeWidth="2"
        fill="none"
        opacity=".6"
      />
      <path
        d="M80 92 q0 12 0 24 t-2 18"
        stroke="#378add"
        strokeWidth="2.4"
        fill="none"
      />
      <circle
        cx="112"
        cy="56"
        r="9.5"
        fill="#0b1014"
        stroke="#e2884a"
        strokeWidth="1.7"
      />
      <path
        d="M112 51 v5.5 M112 59.5 v.6"
        stroke="#e2884a"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RoofingIllustration() {
  return (
    <svg width="214" height="200" viewBox="0 0 160 160" fill="none">
      <polygon
        points="80,20 140,80 20,80"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#1d2836"
      />
      <line
        x1="80"
        y1="20"
        x2="80"
        y2="80"
        stroke="#56697b"
        strokeWidth="1"
        strokeDasharray="4,3"
      />
      <rect
        x="25"
        y="80"
        width="110"
        height="60"
        rx="2"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <rect
        x="60"
        y="100"
        width="40"
        height="40"
        rx="2"
        stroke="#56697b"
        strokeWidth="1.2"
        fill="#1d2836"
      />
      <line
        x1="80"
        y1="100"
        x2="80"
        y2="140"
        stroke="#56697b"
        strokeWidth=".8"
      />
      <line
        x1="60"
        y1="120"
        x2="100"
        y2="120"
        stroke="#56697b"
        strokeWidth=".8"
      />
      <path
        d="M30 50 q5 -6 10 0 t10 0 t10 0"
        stroke="#378add"
        strokeWidth="2"
        fill="none"
        opacity=".8"
      />
      <path
        d="M45 38 q5 -6 10 0 t10 0"
        stroke="#378add"
        strokeWidth="1.6"
        fill="none"
        opacity=".6"
      />
      <circle
        cx="112"
        cy="56"
        r="9.5"
        fill="#0b1014"
        stroke="#e2884a"
        strokeWidth="1.7"
      />
      <path
        d="M112 51 v5.5 M112 59.5 v.6"
        stroke="#e2884a"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GenericIllustration() {
  return (
    <svg width="214" height="200" viewBox="0 0 160 160" fill="none">
      <circle
        cx="80"
        cy="90"
        r="50"
        stroke="#82a0ba"
        strokeWidth="1.6"
        fill="#141d25"
      />
      <circle cx="80" cy="90" r="35" stroke="#56697b" strokeWidth="1" />
      <path
        d="M80 55 v35 M80 98 v4"
        stroke="#e2884a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle
        cx="112"
        cy="56"
        r="9.5"
        fill="#0b1014"
        stroke="#e2884a"
        strokeWidth="1.7"
      />
      <path
        d="M112 51 v5.5 M112 59.5 v.6"
        stroke="#e2884a"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProblemIllustration({ title }) {
  const t = (title || '').toLowerCase();
  if (
    t.includes('ac') ||
    t.includes('a/c') ||
    t.includes('air') ||
    t.includes('hvac') ||
    t.includes('cool') ||
    t.includes('heat')
  )
    return <ACIllustration />;
  if (
    t.includes('plumb') ||
    t.includes('pipe') ||
    t.includes('water') ||
    t.includes('leak') ||
    t.includes('drain')
  )
    return <PlumbingIllustration />;
  if (t.includes('roof') || t.includes('shingle') || t.includes('gutter'))
    return <RoofingIllustration />;
  return <GenericIllustration />;
}

const NOW = new Date();
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
function fmtNow() {
  return `${
    MONTHS[NOW.getMonth()]
  } ${NOW.getDate()} ${NOW.getFullYear()} · ${NOW.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
function fmtRecv() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[NOW.getDay()]} ${
    MONTHS[NOW.getMonth()]
  } ${NOW.getDate()} · ${NOW.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

const css = `
  .lr-card{width:1000px;max-width:100%;margin:0 auto;position:relative;border:1px solid #2b3a47;overflow:hidden;
    background:linear-gradient(180deg,#101921 0%,#0d141b 100%);font-family:'Liberation Sans','DejaVu Sans',Arial,sans-serif;}
  .lr-grid{background-image:linear-gradient(rgba(130,160,186,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(130,160,186,.045) 1px,transparent 1px);background-size:42px 42px;}
  .lr-crop{position:absolute;width:16px;height:16px;border-color:#c89456;opacity:.7;z-index:3}
  .lr-crop.tl{top:14px;left:14px;border-left:2px solid;border-top:2px solid}
  .lr-crop.tr{top:14px;right:14px;border-right:2px solid;border-top:2px solid}
  .lr-crop.bl{bottom:14px;left:14px;border-left:2px solid;border-bottom:2px solid}
  .lr-crop.br{bottom:14px;right:14px;border-right:2px solid;border-bottom:2px solid}
  .lr-pad{position:relative;padding:40px 44px 34px}
  .lr-mono{font-family:'DejaVu Sans Mono','Liberation Mono',monospace}
  .lr-serif{font-family:'Liberation Serif','DejaVu Serif',Georgia,serif}
  .lr-badge{display:inline-flex;align-items:center;gap:9px;padding:8px 14px;border:1px solid #c89456;background:rgba(200,148,86,.1);border-radius:2px;margin-bottom:17px}
  .lr-badge .d{width:8px;height:8px;border-radius:50%;background:#e6b074;box-shadow:0 0 10px #c89456}
  .lr-badge .x{font-size:11px;letter-spacing:2.5px;color:#e6b074;text-transform:uppercase;font-weight:700}
  .lr-tier{display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 11px;border:1px solid transparent;border-radius:2px}
  .lr-tier .td{width:9px;height:9px;border-radius:50%;border:1.5px solid #56697b;background:transparent;flex:none}
  .lr-tier .tn{font-size:11.5px;letter-spacing:1.5px;color:#7c8e9c;text-transform:uppercase;font-weight:700}
  .lr-tier.active{flex-direction:column;align-items:center;gap:7px;padding:11px 13px;border-width:1px;border-left-width:3px}
  .lr-tier.active .trow{display:flex;align-items:center;gap:10px}
  .lr-tier.active .td{border:none}
  .lr-tier.active .tn{font-weight:800}
  .lr-tier.active .tr{text-align:center;font-size:12.5px;color:#aebfcc;line-height:1.32}
  .lr-day{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:34px;border:1px solid #21303b;border-radius:3px}
  .lr-day .dl{font-size:10px;color:#7c8e9c;font-weight:700;line-height:1}
  .lr-day .dot{width:4px;height:4px;border-radius:50%;background:transparent}
  .lr-day.on{background:rgba(200,148,86,.1);border-color:rgba(200,148,86,.4)}
  .lr-day.on .dl{color:#e6b074}
  .lr-day.today{background:rgba(200,148,86,.2);border-color:#c89456}
  .lr-day.today .dl{color:#e6b074}
  .lr-day.today .dot{background:#e6b074}
  .lr-recap q{quotes:'"' '"';color:#eef3f7;font-weight:700}
  .lr-recap q::before{content:open-quote;color:#c89456}
  .lr-recap q::after{content:close-quote;color:#c89456}
  .lr-prob q{quotes:'"' '"';color:#eef3f7;font-weight:700}
  .lr-prob q::before{content:open-quote;color:#c89456}
  .lr-prob q::after{content:close-quote;color:#c89456}
  .lr-stamp{display:inline-flex;align-items:center;gap:8px;border:1.5px solid #5cb083;padding:7px 13px;border-radius:2px;transform:rotate(-1.5deg)}
  .json-area{width:100%;height:220px;background:#0b1014;color:#82a0ba;border:1px solid #2b3a47;border-radius:4px;padding:14px;font-family:monospace;font-size:12px;resize:vertical;outline:none}
  .json-area:focus{border-color:#c89456}
  .gen-btn{background:rgba(200,148,86,.12);border:1px solid #c89456;color:#e6b074;font-family:monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;border-radius:2px;cursor:pointer}
  .gen-btn:hover{background:rgba(200,148,86,.22)}
  .err-box{background:rgba(220,91,78,.12);border:1px solid rgba(220,91,78,.4);color:#f0a59b;font-family:monospace;font-size:12px;padding:12px 16px;border-radius:2px;margin-top:10px}
`;

export default function LeadRescueReport() {
  const [jsonInput, setJsonInput] = useState('');
  const [data, setData] = useState(SAMPLE);
  const [error, setError] = useState('');
  const [showInput, setShowInput] = useState(false);

  function handleGenerate() {
    try {
      const parsed = JSON.parse(jsonInput);
      setData(parsed);
      setError('');
      setShowInput(false);
    } catch (e) {
      setError('Invalid JSON — check the format and try again.');
    }
  }

  const d = data;
  const tier = d.priority?.tier || 'Standard';
  const tc = TIER_COLORS[tier] || TIER_COLORS.Standard;
  const days = d.callback?.days || [];
  const rptNum = Math.floor(Math.random() * 9000) + 1000;

  return (
    <div
      style={{
        background: '#0b1014',
        minHeight: '100vh',
        padding: '32px 16px',
      }}
    >
      <style>{css}</style>

      {/* Input panel toggle */}
      <div
        style={{
          width: 1000,
          maxWidth: '100%',
          margin: '0 auto 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <button className="gen-btn" onClick={() => setShowInput((v) => !v)}>
          {showInput ? '▲ Hide Input' : '▼ Paste JSON'}
        </button>
        {showInput && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#56697b',
              letterSpacing: '1px',
            }}
          >
            PASTE OUTPUT FROM EXTRACTION PROMPT · HIT GENERATE
          </span>
        )}
      </div>

      {showInput && (
        <div style={{ width: 1000, maxWidth: '100%', margin: '0 auto 20px' }}>
          <textarea
            className="json-area"
            placeholder="Paste the raw JSON from the Claude extraction node here…"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 10,
              alignItems: 'center',
            }}
          >
            <button className="gen-btn" onClick={handleGenerate}>
              Generate Report →
            </button>
            <button
              className="gen-btn"
              style={{ opacity: 0.6 }}
              onClick={() => {
                setData(SAMPLE);
                setJsonInput('');
                setError('');
              }}
            >
              Load Sample
            </button>
          </div>
          {error && <div className="err-box">{error}</div>}
        </div>
      )}

      {/* REPORT CARD */}
      <div className="lr-card lr-grid">
        <span className="lr-crop tl" />
        <span className="lr-crop tr" />
        <span className="lr-crop bl" />
        <span className="lr-crop br" />
        <div className="lr-pad">
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: 20,
              borderBottom: '1px solid #21303b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <ShieldLogo />
              <div>
                <div
                  className="lr-serif"
                  style={{
                    fontSize: 29,
                    fontWeight: 700,
                    letterSpacing: 3,
                    color: '#eef3f7',
                    lineHeight: 1,
                  }}
                >
                  LEAD RESCUE
                </div>
                <div
                  className="lr-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '3.5px',
                    color: '#c89456',
                    textTransform: 'uppercase',
                    marginTop: 7,
                  }}
                >
                  Never miss another call
                </div>
              </div>
            </div>
            <div
              className="lr-mono"
              style={{
                textAlign: 'right',
                fontSize: 10.5,
                lineHeight: 1.9,
                color: '#7c8e9c',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              <div>
                RPT&nbsp;
                <span style={{ color: '#aebfcc' }}>·&nbsp;{rptNum}</span>
              </div>
              <div>
                RECV&nbsp;<span style={{ color: '#aebfcc' }}>{fmtRecv()}</span>
              </div>
              <div>
                CHAN&nbsp;
                <span style={{ color: '#aebfcc' }}>INBOUND · VOICE AI</span>
              </div>
            </div>
          </div>

          {/* VERDICT */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '26px 0 24px',
            }}
          >
            <div>
              <span
                className="lr-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 4,
                  color: '#c89456',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 7,
                }}
              >
                Call Intelligence — Dispatch Report
              </span>
              <div
                className="lr-serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: 52,
                  lineHeight: 0.98,
                  color: '#eef3f7',
                }}
              >
                Lead <span style={{ color: '#e6b074' }}>rescued.</span>
              </div>
              <div
                className="lr-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '1.5px',
                  color: '#7c8e9c',
                  textTransform: 'uppercase',
                  marginTop: 12,
                }}
              >
                Missed on the main line · caught by Voice AI
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '11px 18px',
                border: '1px solid #5cb083',
                background: 'rgba(92,176,131,.12)',
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#5cb083',
                  boxShadow: '0 0 12px #5cb083',
                  display: 'inline-block',
                }}
              />
              <span
                className="lr-mono"
                style={{
                  fontSize: 13,
                  letterSpacing: 2,
                  color: '#5cb083',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Recovered
              </span>
            </div>
          </div>

          {/* SECTION LABEL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '4px 0 13px',
            }}
          >
            <span
              className="lr-mono"
              style={{
                fontSize: 10.5,
                letterSpacing: 3,
                color: '#82a0ba',
                textTransform: 'uppercase',
              }}
            >
              Read first
            </span>
            <span style={{ flex: 1, height: 1, background: '#21303b' }} />
            <span
              className="lr-mono"
              style={{ fontSize: 10, letterSpacing: 1, color: '#7c8e9c' }}
            >
              Lead · priority order
            </span>
          </div>

          {/* BOARD */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.55fr 1fr',
              gap: 12,
            }}
          >
            {/* Lead box */}
            <div
              style={{
                background: '#1d2836',
                border: '1px solid #21303b',
                borderLeft: '3px solid #c89456',
                padding: '22px 28px',
              }}
            >
              <div className="lr-badge">
                <span className="d" />
                <span className="x lr-mono">New Lead</span>
              </div>
              <div
                className="lr-serif"
                style={{
                  fontStyle: 'italic',
                  fontSize: 46,
                  fontWeight: 400,
                  color: '#eef3f7',
                  lineHeight: 1.02,
                }}
              >
                {d.lead?.name || 'Unknown Caller'}
              </div>
              <div
                className="lr-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '1.5px',
                  color: '#7c8e9c',
                  textTransform: 'uppercase',
                  marginTop: 12,
                }}
              >
                {d.lead?.descriptor || ''}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px 24px',
                  marginTop: 24,
                  paddingTop: 22,
                  borderTop: '1px solid #21303b',
                }}
              >
                {[
                  { icon: 'phone', label: 'Phone', val: d.lead?.phone },
                  {
                    icon: 'chat',
                    label: 'Preferred Contact',
                    val: d.lead?.preferred_contact,
                  },
                  {
                    icon: 'search',
                    label: 'How They Found You',
                    val: d.lead?.how_found,
                  },
                  { icon: 'email', label: 'Email', val: d.lead?.email },
                ].map(({ icon, label, val }, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#82a0ba"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flex: 'none', marginTop: 1 }}
                    >
                      {icon === 'phone' && (
                        <>
                          <rect
                            x="4.6"
                            y="1.5"
                            width="6.8"
                            height="13"
                            rx="1.6"
                          />
                          <line x1="6.7" y1="12.4" x2="9.3" y2="12.4" />
                        </>
                      )}
                      {icon === 'chat' && (
                        <path d="M2.5 4.2 A1.7 1.7 0 0 1 4.2 2.5 H11.8 A1.7 1.7 0 0 1 13.5 4.2 V8.5 A1.7 1.7 0 0 1 11.8 10.2 H6.5 L3.5 12.6 V10.2 A1.7 1.7 0 0 1 2.5 8.5 Z" />
                      )}
                      {icon === 'search' && (
                        <>
                          <circle cx="6.8" cy="6.8" r="4" />
                          <line x1="9.7" y1="9.7" x2="13.5" y2="13.5" />
                        </>
                      )}
                      {icon === 'email' && (
                        <>
                          <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
                          <path d="M2.6 4.6 L8 8.6 L13.4 4.6" />
                        </>
                      )}
                    </svg>
                    <div>
                      <div
                        className="lr-mono"
                        style={{
                          fontSize: 9,
                          letterSpacing: 2,
                          color: '#7c8e9c',
                          textTransform: 'uppercase',
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        className="lr-mono"
                        style={{
                          fontSize: 15.5,
                          color: '#eef3f7',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                        }}
                      >
                        {val || 'Not provided'}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Address — full width */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#82a0ba"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: 'none', marginTop: 1 }}
                  >
                    <path d="M8 14.5 S12.6 9.6 12.6 6.3 A4.6 4.6 0 1 0 3.4 6.3 C3.4 9.6 8 14.5 8 14.5 Z" />
                    <circle cx="8" cy="6.3" r="1.8" />
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      className="lr-mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        color: '#7c8e9c',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Service Address
                    </div>
                    <div
                      className="lr-mono"
                      style={{
                        fontSize: 15.5,
                        color: '#eef3f7',
                        lineHeight: 1.35,
                      }}
                    >
                      {d.lead?.address_line1 || 'Not provided'}
                      <br />
                      {d.lead?.address_line2 || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Priority */}
              <div
                style={{
                  background: '#18222e',
                  border: '1px solid #21303b',
                  padding: '15px 17px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 12,
                  }}
                >
                  <span
                    className="lr-mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '2.5px',
                      color: '#7c8e9c',
                      textTransform: 'uppercase',
                    }}
                  >
                    Priority
                  </span>
                  <span
                    className="lr-mono"
                    style={{
                      fontSize: 8,
                      letterSpacing: 1,
                      color: '#7c8e9c',
                      textTransform: 'uppercase',
                    }}
                  >
                    Caller-set · AI-verified
                  </span>
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
                >
                  {TIERS.map((t) => {
                    const isActive = t === tier;
                    const c = TIER_COLORS[t];
                    return isActive ? (
                      <div
                        key={t}
                        className="lr-tier active lr-mono"
                        style={{
                          borderColor: `rgba(${hexToRgb(c.border)},.5)`,
                          borderLeftColor: c.border,
                          background: c.bg,
                        }}
                      >
                        <div className="trow">
                          <span
                            className="td"
                            style={{
                              background: c.dot,
                              boxShadow: `0 0 10px ${c.dot}`,
                            }}
                          />
                          <span className="tn" style={{ color: c.text }}>
                            {t.toUpperCase()}
                          </span>
                        </div>
                        <span className="tr">{d.priority?.reason || ''}</span>
                      </div>
                    ) : (
                      <div key={t} className="lr-tier lr-mono">
                        <span className="td" />
                        <span className="tn">{t.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Callback */}
              <div
                style={{
                  background: '#18222e',
                  border: '1px solid #21303b',
                  borderLeft: '3px solid #c89456',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 13,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <div
                  className="lr-mono"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '2.5px',
                    color: '#7c8e9c',
                    textTransform: 'uppercase',
                  }}
                >
                  Best Callback Window
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {/* Clock */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                      flex: 'none',
                    }}
                  >
                    <svg width="62" height="62" viewBox="0 0 64 64" fill="none">
                      <circle
                        cx="32"
                        cy="32"
                        r="27"
                        stroke="#82a0ba"
                        strokeWidth="1.5"
                        fill="#141d25"
                      />
                      <path
                        d="M32 32 L55.4 45.5 A27 27 0 0 1 32 59 Z"
                        fill="rgba(200,148,86,.32)"
                        stroke="#c89456"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="32"
                        y1="7"
                        x2="32"
                        y2="11"
                        stroke="#7c8e9c"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="57"
                        y1="32"
                        x2="53"
                        y2="32"
                        stroke="#7c8e9c"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="32"
                        y1="57"
                        x2="32"
                        y2="53"
                        stroke="#7c8e9c"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="7"
                        y1="32"
                        x2="11"
                        y2="32"
                        stroke="#7c8e9c"
                        strokeWidth="1.5"
                      />
                      <circle cx="32" cy="32" r="1.8" fill="#82a0ba" />
                    </svg>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span
                        className="lr-mono"
                        style={{
                          fontSize: 12,
                          letterSpacing: '.5px',
                          color: '#e6b074',
                          fontWeight: 700,
                        }}
                      >
                        {d.callback?.time || 'Anytime'}
                      </span>
                      <span
                        className="lr-mono"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 8.5,
                          letterSpacing: '1.5px',
                          color: '#7c8e9c',
                          textTransform: 'uppercase',
                        }}
                      >
                        {periodIcon(d.callback?.period)}
                        {d.callback?.period || 'Anytime'}
                      </span>
                    </div>
                  </div>
                  {/* Calendar */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}
                  >
                    <span
                      className="lr-mono"
                      style={{
                        fontSize: 8.5,
                        letterSpacing: '1.5px',
                        color: '#7c8e9c',
                        textTransform: 'uppercase',
                      }}
                    >
                      Best day to call
                    </span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {DAY_KEYS.map((dk, i) => {
                        const on = isDayActive(dk, days);
                        const today = isTodayKey(dk, days);
                        const cls =
                          'lr-day lr-mono' +
                          (today ? ' today' : on ? ' on' : '');
                        return (
                          <div key={dk} className={cls}>
                            <span className="dl">{DAY_LABELS[i]}</span>
                            <span className="dot" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div
                  style={{ fontSize: 12.5, color: '#aebfcc', lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{
                    __html: (d.callback?.note || '').replace(
                      /"([^"]+)"/g,
                      '"<b style=\'color:#eef3f7\'>$1</b>"'
                    ),
                  }}
                />
              </div>
            </div>
          </div>

          {/* LOWER */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.45fr 1fr',
              gap: 14,
              marginTop: 14,
              alignItems: 'stretch',
            }}
          >
            {/* Recap */}
            <div
              className="lr-recap"
              style={{
                background: '#141d25',
                border: '1px solid #21303b',
                borderLeft: '3px solid #82a0ba',
                padding: '22px 26px',
              }}
            >
              <div
                className="lr-mono"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '2.5px',
                  color: '#aebfcc',
                  textTransform: 'uppercase',
                  marginBottom: 14,
                }}
              >
                What happened on the call{' '}
                <span style={{ color: '#7c8e9c', letterSpacing: 1 }}>
                  — bold = caller's exact words
                </span>
              </div>
              <RecapHtml html={d.recap || ''} />
              <div
                style={{
                  marginTop: 16,
                  padding: '15px 17px',
                  background: 'rgba(200,148,86,.05)',
                  border: '1px solid rgba(200,148,86,.18)',
                  borderRadius: 2,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: '#aebfcc',
                }}
              >
                <span
                  className="lr-mono"
                  style={{
                    display: 'inline-block',
                    fontSize: 10,
                    letterSpacing: 2,
                    color: '#e6b074',
                    textTransform: 'uppercase',
                    background: 'rgba(200,148,86,.12)',
                    border: '1px solid rgba(200,148,86,.32)',
                    padding: '4px 9px',
                    borderRadius: 2,
                    marginRight: 10,
                    verticalAlign: 'middle',
                  }}
                >
                  Tone read
                </span>
                {d.tone_read || ''}
              </div>
            </div>

            {/* Problem */}
            <div
              className="lr-prob"
              style={{
                background: '#18222e',
                border: '1px solid #21303b',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  className="lr-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    color: '#c89456',
                    textTransform: 'uppercase',
                    marginBottom: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: '#c89456',
                      transform: 'rotate(45deg)',
                      display: 'inline-block',
                      flex: 'none',
                    }}
                  />
                  Reported Problem
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#eef3f7',
                    letterSpacing: '.3px',
                  }}
                >
                  {d.problem?.title || 'Unknown'}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#aebfcc',
                    marginTop: 7,
                    lineHeight: 1.4,
                  }}
                >
                  {d.problem?.detail || ''}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '14px 0 8px',
                }}
              >
                <ProblemIllustration title={d.problem?.title} />
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13.5,
                  color: '#aebfcc',
                  marginTop: 6,
                }}
              >
                In her words: <q>{d.problem?.quote || ''}</q>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid #21303b',
            }}
          >
            <div className="lr-stamp">
              <span style={{ color: '#5cb083', fontSize: 13 }}>✓</span>
              <span
                className="lr-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#5cb083',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Reviewed · Approved for delivery
              </span>
            </div>
            <div
              className="lr-mono"
              style={{
                textAlign: 'right',
                fontSize: 9.5,
                letterSpacing: '1.5px',
                color: '#7c8e9c',
                textTransform: 'uppercase',
                lineHeight: 1.8,
              }}
            >
              <div>
                Call intelligence by{' '}
                <b style={{ color: '#c89456' }}>Lead Rescue</b>
              </div>
              <div>Generated · {fmtNow()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
    : '128,128,128';
}
