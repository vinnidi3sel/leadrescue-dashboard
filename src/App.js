import React, { useState, useEffect } from "react";

const SAMPLE_CALLS = [
  {
    id: 1,
    created_at: "2026-06-18T14:14:00.000Z",
    caller_name: "Margaret Reyes",
    report_json: {
      lead: { name:"Margaret Reyes", descriptor:"Homeowner · New customer · El Dorado Hills", phone:"(916) 555-0148", preferred_contact:"Call or text", email:"mreyes@gmail.com", address_line1:"1142 Oak Ridge Dr", address_line2:"El Dorado Hills, CA 95762", how_found:'Google — "AC repair near me"' },
      priority: { tier:"Urgent", reason:"Heat advisory · elderly resident · getting worse" },
      callback: { time:"4–6 PM", period:"Afternoon", days:["Tue"], note:"after 4 is best, I'm home from work by then" },
      recap: "Margaret called at 2:14 PM; Voice AI answered. She described it plainly — <q>my air conditioner's running but it's just blowing warm air</q> — and added <q>it started this morning and now the house is up to 84 degrees.</q> She raised the urgency herself: <q>my mom is elderly, and this heat is really hard on her.</q>",
      tone_read: "Anxious and direct — high-intent, time-sensitive. Named the urgency herself before being asked.",
      dispatch_note: "Elderly resident in active heat — motivated caller, not price-shopping. Window opens at 4 PM.",
      problem: { title:"A/C Not Cooling", detail:"Running but blowing warm air · 84°F indoor · started this morning", quote:"it's just blowing warm air" }
    }
  },
  {
    id: 2,
    created_at: "2026-06-18T10:45:00.000Z",
    caller_name: "James Okonkwo",
    report_json: {
      lead: { name:"James Okonkwo", descriptor:"Homeowner · Folsom", phone:"(916) 444-7821", preferred_contact:"Call", email:"Not provided", address_line1:"423 Sutter Gate Ave", address_line2:"Folsom, CA 95630", how_found:"Referral from neighbor" },
      priority: { tier:"Standard", reason:"Roof inspection needed, no active damage reported" },
      callback: { time:"Anytime", period:"Anytime", days:["Weekdays"], note:"anytime during the week works for me" },
      recap: "James called requesting a roof inspection. He mentioned <q>my neighbor just had theirs done and recommended you.</q> No urgency was expressed and he was relaxed throughout the call.",
      tone_read: "Calm and unhurried — clearly a referral, trusts the business already. Low pressure situation.",
      dispatch_note: "Warm referral lead — neighbor already a customer. Easy close, just needs scheduling.",
      problem: { title:"Roof Inspection", detail:"Routine inspection requested, no damage reported", quote:"just want to get it checked out" }
    }
  },
  {
    id: 3,
    created_at: "2026-06-17T18:30:00.000Z",
    caller_name: "Linda Park",
    report_json: {
      lead: { name:"Linda Park", descriptor:"Homeowner · El Dorado Hills", phone:"(916) 302-5544", preferred_contact:"Call or text", email:"lpark@gmail.com", address_line1:"88 Ridgeline Ct", address_line2:"El Dorado Hills, CA 95762", how_found:"Google search" },
      priority: { tier:"Emergency", reason:"No heat with elderly parent in home, overnight temperatures dropping" },
      callback: { time:"ASAP", period:"Evening", days:["Today"], note:"please call me back as soon as possible" },
      recap: "Linda called in a panic — <q>our furnace just stopped working completely</q> and noted <q>my father is 82 and it's getting cold tonight.</q> She was clearly distressed and asked for same-day service.",
      tone_read: "Visibly stressed — genuine emergency situation. Will respond well to a calm, reassuring callback.",
      dispatch_note: "82-year-old in home with no heat overnight. Call immediately — this is same-day or nothing.",
      problem: { title:"Furnace Failure", detail:"Complete furnace shutdown · elderly occupant · dropping temps", quote:"our furnace just stopped working completely" }
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

const TIER_DOT_COLORS = {
  Emergency: "#dc5b4e",
  Urgent: "#e2884a",
  Standard: "#378add",
  Quote: "#4a7a65"
};

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
    <p style={{fontSize:"clamp(9px,2.5vw,10.5px)",lineHeight:1.65,color:"#aebfcc",margin:0}}>
      {parts.map((p,i) => p.type === "q"
        ? <strong key={i} style={{color:"#eef3f7",fontWeight:700}}>{p.val}</strong>
        : <span key={i}>{p.val}</span>
      )}
    </p>
  );
}

function ShieldLogo({ size=38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" fill="none">
      <path d="M23 4 L39.5 10 L39.5 22.5 C39.5 31.5 32 38.5 23 42 C14 38.5 6.5 31.5 6.5 22.5 L6.5 10 Z"
        stroke="#c89456" strokeWidth="1.7" fill="rgba(200,148,86,0.06)" strokeLinejoin="round"/>
      <path d="M11 24 H18 L20 24 L21.6 16.5 L24 31.5 L26.4 21 L28 24 H35"
        stroke="#e6b074" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="35" cy="24" r="1.6" fill="#e6b074"/>
    </svg>
  );
}

function ACIllustration() {
  return <svg width="90" height="75" viewBox="0 0 160 160" fill="none">
    <path d="M34 32 q7 -10 14 0 t14 0" stroke="#e2884a" strokeWidth="2.4" fill="none"/>
    <path d="M70 28 q7 -10 14 0 t14 0" stroke="#e2884a" strokeWidth="2.4" fill="none"/>
    <rect x="20" y="48" width="104" height="100" rx="4" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <rect x="20" y="48" width="104" height="20" fill="#1d2836" stroke="#82a0ba" strokeWidth="1.6"/>
    <circle cx="72" cy="104" r="32" stroke="#82a0ba" strokeWidth="1.6"/>
    <circle cx="72" cy="104" r="26" stroke="#56697b" strokeWidth="1"/>
    <circle cx="72" cy="104" r="4.5" fill="#c89456"/>
    <rect x="140" y="46" width="9" height="60" rx="4.5" stroke="#82a0ba" strokeWidth="1.4" fill="#0b1014"/>
    <circle cx="144.5" cy="114" r="8" fill="#e2884a"/>
    <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
    <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>;
}

function PlumbingIllustration() {
  return <svg width="90" height="75" viewBox="0 0 160 160" fill="none">
    <rect x="60" y="20" width="14" height="60" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <rect x="86" y="20" width="14" height="60" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <rect x="55" y="78" width="50" height="14" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#1d2836"/>
    <rect x="65" y="92" width="30" height="50" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <circle cx="80" cy="145" r="8" fill="#378add" opacity=".7"/>
    <path d="M80 92 q0 12 0 24 t-2 18" stroke="#378add" strokeWidth="2.4" fill="none"/>
    <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
    <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>;
}

function RoofingIllustration() {
  return <svg width="90" height="75" viewBox="0 0 160 160" fill="none">
    <polygon points="80,20 140,80 20,80" stroke="#82a0ba" strokeWidth="1.6" fill="#1d2836"/>
    <rect x="25" y="80" width="110" height="60" rx="2" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <rect x="60" y="100" width="40" height="40" rx="2" stroke="#56697b" strokeWidth="1.2" fill="#1d2836"/>
    <path d="M30 50 q5 -6 10 0 t10 0 t10 0" stroke="#378add" strokeWidth="2" fill="none" opacity=".8"/>
    <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
    <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>;
}

function FurnaceIllustration() {
  return <svg width="90" height="75" viewBox="0 0 160 160" fill="none">
    <rect x="40" y="30" width="70" height="110" rx="4" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <rect x="50" y="45" width="50" height="35" rx="2" stroke="#56697b" strokeWidth="1.2" fill="#1d2836"/>
    <circle cx="75" cy="110" r="12" stroke="#e2884a" strokeWidth="1.6" fill="#0b1014"/>
    <path d="M75 102 v8 M75 114 v2" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    <path d="M60 62 q5 -8 15 0 t15 0" stroke="#e2884a" strokeWidth="1.8" fill="none"/>
    <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#dc5b4e" strokeWidth="1.7"/>
    <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#dc5b4e" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>;
}

function GenericIllustration() {
  return <svg width="90" height="75" viewBox="0 0 160 160" fill="none">
    <circle cx="80" cy="90" r="50" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
    <circle cx="80" cy="90" r="35" stroke="#56697b" strokeWidth="1"/>
    <path d="M80 55 v35 M80 98 v4" stroke="#e2884a" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
    <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>;
}

function ProblemIllustration({ title }) {
  const t = (title||"").toLowerCase();
  if (t.includes("furnace")||t.includes("boiler")||t.includes("heat")) return <FurnaceIllustration/>;
  if (t.includes("ac")||t.includes("a/c")||t.includes("air")||t.includes("hvac")||t.includes("cool")) return <ACIllustration/>;
  if (t.includes("plumb")||t.includes("pipe")||t.includes("water")||t.includes("leak")||t.includes("drain")||t.includes("flood")) return <PlumbingIllustration/>;
  if (t.includes("roof")||t.includes("shingle")||t.includes("gutter")) return <RoofingIllustration/>;
  return <GenericIllustration/>;
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
  .lr-app{background:#0b1014;min-height:100vh;font-family:'Liberation Sans','DejaVu Sans',Arial,sans-serif}
  .lr-mono{font-family:'DejaVu Sans Mono','Liberation Mono',monospace}
  .lr-serif{font-family:'Liberation Serif','DejaVu Serif',Georgia,serif}

  /* TOP NAV */
  .lr-nav{background:#101921;border-bottom:1px solid #2b3a47;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  .lr-nav-logo{display:flex;align-items:center;gap:10px}
  .lr-nav-title{font-size:16px;font-weight:700;letter-spacing:2px;color:#eef3f7}
  .lr-nav-sub{font-size:8px;letter-spacing:3px;color:#c89456;text-transform:uppercase;margin-top:2px}
  .lr-nav-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid #5cb083;background:rgba(92,176,131,.1);border-radius:2px}
  .lr-nav-badge-dot{width:6px;height:6px;border-radius:50%;background:#5cb083;box-shadow:0 0 6px #5cb083}
  .lr-nav-badge-txt{font-size:9px;letter-spacing:1.5px;color:#5cb083;text-transform:uppercase;font-weight:700}

  /* CALL LOG */
  .lr-log{padding:12px 16px;border-bottom:1px solid #21303b;background:#0d141b}
  .lr-log-label{font-size:8px;letter-spacing:2px;color:#56697b;text-transform:uppercase;margin-bottom:8px}
  .lr-log-group-label{font-size:8px;letter-spacing:1.5px;color:#56697b;text-transform:uppercase;margin-bottom:5px;margin-top:8px}
  .lr-log-group-label:first-child{margin-top:0}
  .lr-log-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #21303b;border-radius:3px;background:#141d25;margin-bottom:4px;cursor:pointer;transition:border-color .15s}
  .lr-log-item:hover{border-color:#2b3a47}
  .lr-log-item.active{border-color:#c89456;background:rgba(200,148,86,.06)}
  .lr-log-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .lr-log-name{font-size:11px;color:#eef3f7;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-log-problem{font-size:10px;color:#aebfcc;flex:1.2;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lr-log-time{font-size:9px;color:#56697b;flex-shrink:0}
  .lr-log-chevron{font-size:10px;color:#56697b;flex-shrink:0}

  /* REPORT */
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

  /* DESKTOP */
  @media(min-width:768px){
    .lr-layout{display:grid;grid-template-columns:320px 1fr;min-height:100vh}
    .lr-sidebar{border-right:1px solid #21303b;background:#0d141b;overflow-y:auto;height:100vh;position:sticky;top:0}
    .lr-main{overflow-y:auto}
    .lr-nav{display:none}
    .lr-sidebar-nav{background:#101921;border-bottom:1px solid #2b3a47;padding:16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10}
    .lr-log{padding:16px;border-bottom:none}
    .lr-report{padding:0 20px 32px}
    .lr-card{margin-top:16px}
    .lr-pad{padding:20px}
    .report-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:10px;align-items:start}
    .report-right{display:flex;flex-direction:column;gap:8px}
  }

  @media(max-width:767px){
    .lr-layout{display:flex;flex-direction:column}
    .lr-sidebar-nav{display:none}
    .report-grid{display:flex;flex-direction:column;gap:8px}
    .report-right{display:flex;flex-direction:column;gap:8px}
  }

  .gen-btn{background:rgba(200,148,86,.12);border:1px solid #c89456;color:#e6b074;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:2px;cursor:pointer}
  .gen-btn:hover{background:rgba(200,148,86,.22)}
  .json-area{width:100%;height:160px;background:#0b1014;color:#82a0ba;border:1px solid #2b3a47;border-radius:3px;padding:10px;font-family:monospace;font-size:10px;resize:vertical;outline:none}
  .json-area:focus{border-color:#c89456}
  .err-box{background:rgba(220,91,78,.12);border:1px solid rgba(220,91,78,.4);color:#f0a59b;font-family:monospace;font-size:10px;padding:8px 12px;border-radius:2px;margin-top:6px}
`;

function CallLogItem({ call, isActive, onClick }) {
  const tier = call.report_json?.priority?.tier || "Standard";
  const dot = TIER_DOT_COLORS[tier] || "#82a0ba";
  const problem = call.report_json?.problem?.title || "Unknown";
  return (
    <div className={`lr-log-item${isActive?" active":""}`} onClick={onClick}>
      <span className="lr-log-dot" style={{background:dot,boxShadow:isActive?`0 0 5px ${dot}`:undefined}}/>
      <span className="lr-log-name lr-mono">{call.caller_name||"Unknown"}</span>
      <span className="lr-log-problem">{problem}</span>
      <span className="lr-log-time lr-mono">{fmtTime(call.created_at)}</span>
      <span className="lr-log-chevron">›</span>
    </div>
  );
}

function CallLog({ calls, selectedId, onSelect }) {
  const groups = {};
  calls.forEach(c => {
    const g = fmtDateGroup(c.created_at);
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });
  return (
    <div className="lr-log">
      <div className="lr-log-label lr-mono">{calls.length} rescued call{calls.length!==1?"s":""}</div>
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          <div className="lr-log-group-label lr-mono">{date}</div>
          {items.map(c => (
            <CallLogItem key={c.id} call={c} isActive={c.id===selectedId} onClick={()=>onSelect(c)}/>
          ))}
        </div>
      ))}
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

  return (
    <div className="lr-card">
      <div className="lr-grid-bg"/>
      <span className="lr-crop tl"/><span className="lr-crop tr"/>
      <span className="lr-crop bl"/><span className="lr-crop br"/>
      <div className="lr-pad">

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:12,borderBottom:"1px solid #21303b",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <ShieldLogo size={32}/>
            <div>
              <div className="lr-serif" style={{fontSize:"clamp(16px,4vw,20px)",fontWeight:700,letterSpacing:2,color:"#eef3f7",lineHeight:1}}>LEAD RESCUE</div>
              <div className="lr-mono" style={{fontSize:7,letterSpacing:"3px",color:"#c89456",textTransform:"uppercase",marginTop:3}}>Never miss another call</div>
            </div>
          </div>
          <div className="lr-mono" style={{textAlign:"right",fontSize:8,lineHeight:1.9,color:"#56697b",textTransform:"uppercase",letterSpacing:1}}>
            <div>Case <span style={{color:"#aebfcc"}}>#{rptNum}</span></div>
            <div>Recv <span style={{color:"#aebfcc"}}>{fmtRecv(call.created_at)}</span></div>
            <div>Chan <span style={{color:"#aebfcc"}}>Inbound · Voice AI</span></div>
          </div>
        </div>

        {/* HERO */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:12,borderBottom:"1px solid #21303b",marginBottom:12}}>
          <div>
            <div className="lr-mono" style={{fontSize:7,letterSpacing:"3px",color:"#c89456",textTransform:"uppercase",marginBottom:4}}>Call Intelligence — Dispatch Report</div>
            <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(22px,6vw,30px)",lineHeight:.95,color:"#eef3f7"}}>
              Lead <span style={{color:"#e6b074"}}>rescued.</span>
            </div>
            <div className="lr-mono" style={{fontSize:7.5,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginTop:6}}>Missed on the main line · caught by Voice AI</div>
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 10px",border:"1px solid #5cb083",background:"rgba(92,176,131,.1)",borderRadius:2,flexShrink:0,marginLeft:8}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#5cb083",boxShadow:"0 0 6px #5cb083",display:"inline-block"}}/>
            <span className="lr-mono" style={{fontSize:9,letterSpacing:2,color:"#5cb083",textTransform:"uppercase",fontWeight:700}}>Recovered</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="report-grid">

          {/* LEFT BOX */}
          <div className="box" style={{borderLeft:"3px solid #c89456",marginBottom:0}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",border:"1px solid #c89456",background:"rgba(200,148,86,.1)",borderRadius:2,marginBottom:6}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:"#e6b074",display:"inline-block"}}/>
              <span className="lr-mono" style={{fontSize:7.5,letterSpacing:2,color:"#e6b074",textTransform:"uppercase",fontWeight:700}}>New Lead</span>
            </div>
            <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(18px,5vw,24px)",color:"#eef3f7",lineHeight:1,marginBottom:2}}>{d.lead?.name||"Unknown"}</div>
            <div className="lr-mono" style={{fontSize:7.5,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginBottom:6}}>{d.lead?.descriptor||""}</div>
            <div className="div-h"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 12px",marginTop:".3rem",marginBottom:".6rem"}}>
              {[
                {icon:"ti-device-mobile",label:"Phone",val:d.lead?.phone},
                {icon:"ti-message-dots",label:"Preferred contact",val:d.lead?.preferred_contact},
                {icon:"ti-at",label:"Email",val:d.lead?.email},
                {icon:"ti-antenna",label:"How they found you",val:d.lead?.how_found},
              ].map(({icon,label,val})=>(
                <div key={label}>
                  <span className="field-lbl lr-mono">{label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <i className={`ti ${icon}`} style={{fontSize:10,color:"#56697b"}} aria-hidden="true"/>
                    <span className="field-val lr-mono">{val||"Not provided"}</span>
                  </div>
                </div>
              ))}
              <div style={{gridColumn:"1 / -1"}}>
                <span className="field-lbl lr-mono">Service address</span>
                <div style={{display:"flex",alignItems:"flex-start",gap:4}}>
                  <i className="ti ti-map-pin" style={{fontSize:10,color:"#56697b",marginTop:1}} aria-hidden="true"/>
                  <div>
                    <div className="field-val lr-mono">{d.lead?.address_line1||"Not provided"}</div>
                    <div className="field-val-dim lr-mono">{city}</div>
                    <div className="field-val-dim lr-mono">{stateZip}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="div-h"/>
            <div style={{marginTop:".5rem"}}>
              <div className="sec-title lr-mono" style={{marginBottom:6}}><i className="ti ti-file-description" aria-hidden="true"/> What happened on the call</div>
              <RecapHtml html={d.recap||""}/>
              <div style={{padding:"5px 7px",background:"#0d141b",border:"1px solid rgba(200,148,86,.15)",borderLeft:"2px solid #c89456",borderRadius:2,marginTop:6,marginBottom:5}}>
                <div className="sec-title lr-mono" style={{fontSize:8,marginBottom:2,color:"#c89456"}}><i className="ti ti-eye" aria-hidden="true"/> Tone read</div>
                <div style={{fontSize:"clamp(8px,2.2vw,9.5px)",color:"#aebfcc",lineHeight:1.55}}>{d.tone_read||""}</div>
              </div>
              <div style={{padding:"5px 7px",background:"#0d141b",border:"1px solid rgba(92,176,131,.2)",borderLeft:"2px solid #5cb083",borderRadius:2}}>
                <div className="sec-title lr-mono" style={{fontSize:8,marginBottom:2,color:"#5cb083"}}><i className="ti ti-arrow-right" aria-hidden="true"/> Dispatch note</div>
                <div style={{fontSize:"clamp(8px,2.2vw,9.5px)",color:"#eef3f7",lineHeight:1.55}}>{d.dispatch_note||""}</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="report-right">

            <div className="box" style={{marginBottom:0}}>
              <div className="sec-title lr-mono"><i className="ti ti-alert-circle" aria-hidden="true"/> Priority</div>
              {TIERS.map(t => {
                const isActive = t===tier;
                const c = TIER_COLORS[t];
                return (
                  <div key={t} className={`lr-tier lr-mono${isActive?" active":""}`}
                    style={isActive?{borderColor:`rgba(${hexToRgb(c.border)},.5)`,borderLeftColor:c.border,background:c.bg}:{}}>
                    <span className="tdot" style={isActive?{background:c.dot,boxShadow:`0 0 5px ${c.dot}`}:{}}/>
                    <span className="tn" style={{color:isActive?c.text:"#56697b"}}>{t.toUpperCase()}</span>
                    {isActive && <span className="tr">{d.priority?.reason||""}</span>}
                  </div>
                );
              })}
            </div>

            <div className="box" style={{marginBottom:0}}>
              <div className="sec-title lr-mono"><i className="ti ti-clock" aria-hidden="true"/> Best callback window</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div className="lr-mono" style={{fontSize:"clamp(14px,4vw,18px)",color:"#e6b074",fontWeight:700,lineHeight:1}}>{d.callback?.time||"Anytime"}</div>
                <div className="lr-mono" style={{fontSize:7.5,color:"#56697b",letterSpacing:1,textTransform:"uppercase"}}>{d.callback?.period||""}</div>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:5}}>
                {DAY_KEYS.map((dk,i)=>{
                  const on = isDayActive(dk,days);
                  return <div key={dk} className={`lr-day lr-mono${on?" on":""}`}><span className="dl">{DAY_LABELS[i]}</span></div>;
                })}
              </div>
              <div style={{fontSize:"clamp(8px,2.2vw,9px)",lineHeight:1.5,padding:"4px 6px",background:"#0d141b",border:"1px solid #21303b",borderRadius:2}}>
                <span style={{color:"#eef3f7",fontWeight:700}}>"{d.callback?.note||""}"</span>
              </div>
            </div>

            <div className="box" style={{borderLeft:"3px solid #e6b074",marginBottom:0}}>
              <div className="sec-title lr-mono"><i className="ti ti-tool" aria-hidden="true"/> Reported problem</div>
              <div className="lr-serif" style={{fontStyle:"italic",fontSize:"clamp(13px,4vw,16px)",fontWeight:700,color:"#e6b074",lineHeight:1,marginBottom:3}}>{d.problem?.title||"Unknown"}</div>
              <div style={{fontSize:"clamp(8px,2.2vw,9.5px)",color:"#aebfcc",lineHeight:1.4,marginBottom:7}}>{d.problem?.detail||""}</div>
              <div style={{display:"flex",justifyContent:"center",padding:"3px 0 4px"}}>
                <ProblemIllustration title={d.problem?.title}/>
              </div>
              <div style={{textAlign:"center",fontSize:"clamp(8px,2vw,9px)",padding:"3px 6px",background:"#0d141b",border:"1px solid #21303b",borderRadius:2}}>
                <span style={{color:"#56697b"}}>In their words: </span>
                <span style={{color:"#eef3f7",fontWeight:700}}>"{d.problem?.quote||""}"</span>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:10,borderTop:"1px solid #21303b"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid rgba(92,176,131,.35)",padding:"2px 8px",borderRadius:2,transform:"rotate(-1.5deg)"}}>
            <span style={{color:"#5cb083",fontSize:8}}>✓</span>
            <span className="lr-mono" style={{fontSize:7,letterSpacing:"1.5px",color:"#5cb083",textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap"}}>Reviewed · Approved for delivery</span>
          </div>
          <div className="lr-mono" style={{textAlign:"right",fontSize:7.5,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",lineHeight:1.8}}>
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
  const rptNum = React.useRef(Math.floor(Math.random()*9000)+1000).current;

  useEffect(() => {
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?select=*&order=created_at.desc&limit=50`, {
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8",
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8`
      }
    })
    .then(r => r.json())
    .then(rows => {
      if (rows && rows.length > 0) {
        setCalls(rows);
        setSelected(rows[0]);
      } else {
        setCalls(SAMPLE_CALLS);
        setSelected(SAMPLE_CALLS[0]);
      }
      setLoading(false);
    })
    .catch(() => {
      setCalls(SAMPLE_CALLS);
      setSelected(SAMPLE_CALLS[0]);
      setLoading(false);
    });
  }, []);

  function handleGenerate() {
    try {
      const parsed = JSON.parse(jsonInput);
      const newCall = { id: Date.now(), created_at: new Date().toISOString(), caller_name: parsed.lead?.name||"Unknown", report_json: parsed };
      setCalls(prev => [newCall, ...prev]);
      setSelected(newCall);
      setError("");
      setShowInput(false);
      setJsonInput("");
    } catch(e) {
      setError("Invalid JSON — check the format and try again.");
    }
  }

  if (loading) return (
    <div style={{background:"#0b1014",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:"monospace",fontSize:11,color:"#c89456",letterSpacing:2}}>LOADING CALLS...</span>
    </div>
  );

  const sidebar = (
    <>
      <div className="lr-sidebar-nav">
        <ShieldLogo size={32}/>
        <div>
          <div className="lr-serif" style={{fontSize:16,fontWeight:700,letterSpacing:2,color:"#eef3f7",lineHeight:1}}>LEAD RESCUE</div>
          <div className="lr-mono" style={{fontSize:7,letterSpacing:"3px",color:"#c89456",textTransform:"uppercase",marginTop:2}}>Never miss another call</div>
        </div>
      </div>
      <CallLog calls={calls} selectedId={selected?.id} onSelect={c=>{setSelected(c);window.scrollTo&&window.scrollTo({top:0,behavior:"smooth"})}}/>
    </>
  );

  const main = (
    <>
      <nav className="lr-nav">
        <div className="lr-nav-logo">
          <ShieldLogo size={28}/>
          <div>
            <div className="lr-nav-title lr-serif">LEAD RESCUE</div>
            <div className="lr-nav-sub lr-mono">Never miss another call</div>
          </div>
        </div>
        <div className="lr-nav-badge">
          <span className="lr-nav-badge-dot"/>
          <span className="lr-nav-badge-txt lr-mono">Live</span>
        </div>
      </nav>

      <div style={{padding:"8px 16px",borderBottom:"1px solid #21303b",background:"#0d141b"}}>
        <button className="gen-btn lr-mono" onClick={()=>setShowInput(v=>!v)} style={{fontSize:9}}>
          {showInput?"▲ Hide":"▼ Paste JSON"}
        </button>
        {showInput && (
          <div style={{marginTop:8}}>
            <textarea className="json-area" placeholder="Paste raw JSON…" value={jsonInput} onChange={e=>setJsonInput(e.target.value)}/>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button className="gen-btn" onClick={handleGenerate} style={{fontSize:9}}>Generate →</button>
              <button className="gen-btn" style={{opacity:.6,fontSize:9}} onClick={()=>{setCalls(SAMPLE_CALLS);setSelected(SAMPLE_CALLS[0]);setJsonInput("");setError("");}}>Sample</button>
            </div>
            {error && <div className="err-box">{error}</div>}
          </div>
        )}
      </div>

      <div style={{display:"block"}} className="lr-log-mobile">
        <CallLog calls={calls} selectedId={selected?.id} onSelect={c=>setSelected(c)}/>
      </div>

      <div className="lr-report">
        {selected && <Report call={selected} rptNum={rptNum}/>}
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
