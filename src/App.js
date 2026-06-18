import React, { useState, useEffect } from "react";

const SAMPLE = {
  lead: {
    name: "Margaret Reyes",
    descriptor: "Homeowner · New customer · El Dorado Hills",
    phone: "(916) 555-0148",
    preferred_contact: "Call or text",
    email: "mreyes@gmail.com",
    address_line1: "1142 Oak Ridge Dr",
    address_line2: "El Dorado Hills, CA 95762",
    how_found: 'Google — "AC repair near me"'
  },
  priority: { tier: "Urgent", reason: "Heat advisory · elderly resident · getting worse" },
  callback: {
    time: "4–6 PM", period: "Afternoon", days: ["Tue"],
    note: "after 4 is best, I'm home from work by then"
  },
  recap: "Margaret called the main line at 2:14 PM; it rang out and Voice AI answered. She described it plainly — <q>my air conditioner's running but it's just blowing warm air</q> — and added <q>it started this morning and now the house is up to 84 degrees.</q> She raised the urgency herself: <q>my mom lives with me, she's elderly, and this heat is really hard on her.</q> When asked the best way to reach her, she said <q>call or text is fine, but after 4 is best — I'm home from work by then.</q>",
  tone_read: "Anxious and direct — high-intent, time-sensitive. Named the urgency herself before being asked.",
  dispatch_note: "Elderly resident in active heat — motivated caller, not price-shopping. Window opens at 4 PM.",
  problem: {
    title: "A/C Not Cooling",
    detail: "Running but blowing warm air · 84°F indoor · started this morning",
    quote: "it's just blowing warm air"
  }
};

const DAY_KEYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_LABELS = ["M","T","W","T","F","S","S"];
const TIERS = ["Emergency","Urgent","Standard","Quote"];

const TIER_COLORS = {
  Emergency: { border:"#dc5b4e", bg:"rgba(220,91,78,.12)", dot:"#dc5b4e", text:"#f0a59b" },
  Urgent:    { border:"#e2884a", bg:"rgba(226,136,74,.12)", dot:"#e2884a", text:"#f3c59c" },
  Standard:  { border:"#378add", bg:"rgba(55,138,221,.08)", dot:"#378add", text:"#82a0ba" },
  Quote:     { border:"#4a7a65", bg:"rgba(74,122,101,.1)",  dot:"#4a7a65", text:"#7fad95" }
};

function isDayActive(dayKey, days) {
  if (!days || days.length === 0) return false;
  const lk = dayKey.toLowerCase();
  return days.some(d => {
    const ld = d.toLowerCase();
    if (ld === "today" || ld === "anytime") return true;
    if (ld === "weekdays" && ["mon","tue","wed","thu","fri"].includes(lk)) return true;
    if (ld === "weekend" && ["sat","sun"].includes(lk)) return true;
    return ld.startsWith(lk.slice(0,2)) || lk.startsWith(ld.slice(0,2));
  });
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
    <p style={{fontSize:10,lineHeight:1.65,color:"#aebfcc",margin:0}}>
      {parts.map((p,i) => p.type === "q"
        ? <strong key={i} style={{color:"#eef3f7",fontWeight:700}}>{p.val}</strong>
        : <span key={i}>{p.val}</span>
      )}
    </p>
  );
}

function ShieldLogo() {
  return (
    <svg width="38" height="38" viewBox="0 0 46 46" fill="none">
      <path d="M23 4 L39.5 10 L39.5 22.5 C39.5 31.5 32 38.5 23 42 C14 38.5 6.5 31.5 6.5 22.5 L6.5 10 Z"
        stroke="#c89456" strokeWidth="1.7" fill="rgba(200,148,86,0.06)" strokeLinejoin="round"/>
      <path d="M11 24 H18 L20 24 L21.6 16.5 L24 31.5 L26.4 21 L28 24 H35"
        stroke="#e6b074" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="35" cy="24" r="1.6" fill="#e6b074"/>
    </svg>
  );
}

function ACIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <path d="M34 32 q7 -10 14 0 t14 0" stroke="#e2884a" strokeWidth="2.4" fill="none"/>
      <path d="M70 28 q7 -10 14 0 t14 0" stroke="#e2884a" strokeWidth="2.4" fill="none"/>
      <path d="M52 18 q7 -10 14 0 t14 0" stroke="#e2884a" strokeWidth="2" fill="none" opacity=".7"/>
      <rect x="20" y="48" width="104" height="100" rx="4" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="20" y="48" width="104" height="20" fill="#1d2836" stroke="#82a0ba" strokeWidth="1.6"/>
      <circle cx="72" cy="104" r="32" stroke="#82a0ba" strokeWidth="1.6"/>
      <circle cx="72" cy="104" r="26" stroke="#56697b" strokeWidth="1"/>
      <circle cx="72" cy="104" r="4.5" fill="#c89456"/>
      <rect x="140" y="46" width="9" height="60" rx="4.5" stroke="#82a0ba" strokeWidth="1.4" fill="#0b1014"/>
      <circle cx="144.5" cy="114" r="8" fill="#e2884a"/>
      <rect x="142" y="78" width="5" height="36" rx="2.5" fill="#e2884a"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function PlumbingIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <rect x="60" y="20" width="14" height="60" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="86" y="20" width="14" height="60" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="55" y="78" width="50" height="14" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#1d2836"/>
      <rect x="65" y="92" width="30" height="50" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <circle cx="80" cy="145" r="8" fill="#378add" opacity=".7"/>
      <path d="M72 92 q-4 8 -8 20 t-4 18" stroke="#378add" strokeWidth="2" fill="none" opacity=".8"/>
      <path d="M80 92 q0 12 0 24 t-2 18" stroke="#378add" strokeWidth="2.4" fill="none"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function RoofingIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <polygon points="80,20 140,80 20,80" stroke="#82a0ba" strokeWidth="1.6" fill="#1d2836"/>
      <rect x="25" y="80" width="110" height="60" rx="2" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="60" y="100" width="40" height="40" rx="2" stroke="#56697b" strokeWidth="1.2" fill="#1d2836"/>
      <path d="M30 50 q5 -6 10 0 t10 0 t10 0" stroke="#378add" strokeWidth="2" fill="none" opacity=".8"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function FurnaceIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <rect x="40" y="30" width="70" height="110" rx="4" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="50" y="45" width="50" height="35" rx="2" stroke="#56697b" strokeWidth="1.2" fill="#1d2836"/>
      <circle cx="75" cy="110" r="12" stroke="#e2884a" strokeWidth="1.6" fill="#0b1014"/>
      <path d="M75 102 v8 M75 114 v2" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
      <path d="M60 62 q5 -8 15 0 t15 0" stroke="#e2884a" strokeWidth="1.8" fill="none"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#dc5b4e" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#dc5b4e" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function ElectricalIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <rect x="55" y="25" width="50" height="90" rx="3" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <rect x="63" y="35" width="34" height="20" rx="2" stroke="#56697b" strokeWidth="1" fill="#1d2836"/>
      <path d="M68 70 L80 50 L92 70 L84 70 L84 90 L76 90 L76 70 Z" stroke="#e6b074" strokeWidth="1.5" fill="rgba(200,148,86,.15)"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function WaterHeaterIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <rect x="50" y="25" width="55" height="110" rx="6" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <circle cx="77" cy="80" r="22" stroke="#378add" strokeWidth="1.4" fill="rgba(55,138,221,.08)"/>
      <path d="M70 80 q4 -10 14 0" stroke="#378add" strokeWidth="2" fill="none"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function GenericIllustration() {
  return (
    <svg width="100" height="82" viewBox="0 0 160 160" fill="none">
      <circle cx="80" cy="90" r="50" stroke="#82a0ba" strokeWidth="1.6" fill="#141d25"/>
      <circle cx="80" cy="90" r="35" stroke="#56697b" strokeWidth="1"/>
      <path d="M80 55 v35 M80 98 v4" stroke="#e2884a" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="112" cy="56" r="9.5" fill="#0b1014" stroke="#e2884a" strokeWidth="1.7"/>
      <path d="M112 51 v5.5 M112 59.5 v.6" stroke="#e2884a" strokeWidth="1.9" strokeLinecap="round"/>
    </svg>
  );
}

function ProblemIllustration({ title }) {
  const t = (title || "").toLowerCase();
  if (t.includes("furnace") || t.includes("boiler")) return <FurnaceIllustration />;
  if (t.includes("ac") || t.includes("a/c") || t.includes("air") || t.includes("hvac") || t.includes("cool")) return <ACIllustration />;
  if (t.includes("plumb") || t.includes("pipe") || t.includes("water") || t.includes("leak") || t.includes("drain") || t.includes("flood")) return <PlumbingIllustration />;
  if (t.includes("roof") || t.includes("shingle") || t.includes("gutter")) return <RoofingIllustration />;
  if (t.includes("electric") || t.includes("power") || t.includes("outlet") || t.includes("breaker")) return <ElectricalIllustration />;
  if (t.includes("water heater") || t.includes("hot water")) return <WaterHeaterIllustration />;
  return <GenericIllustration />;
}

const NOW = new Date();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_W = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function fmtNow() {
  return `${MONTHS[NOW.getMonth()]} ${NOW.getDate()} ${NOW.getFullYear()} · ${NOW.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`;
}
function fmtRecv() {
  return `${DAYS_W[NOW.getDay()]} ${MONTHS[NOW.getMonth()]} ${NOW.getDate()} · ${NOW.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`;
}
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "128,128,128";
}

const css = `
  .lr-wrap{width:1000px;max-width:100%;margin:0 auto}
  .lr-card{position:relative;border:1px solid #2b3a47;overflow:hidden;background:linear-gradient(180deg,#101921 0%,#0d141b 100%);font-family:'Liberation Sans','DejaVu Sans',Arial,sans-serif}
  .lr-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(130,160,186,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(130,160,186,.04) 1px,transparent 1px);background-size:42px 42px;pointer-events:none}
  .lr-crop{position:absolute;width:13px;height:13px;border-color:#c89456;opacity:.6;z-index:3}
  .lr-crop.tl{top:10px;left:10px;border-left:1.5px solid;border-top:1.5px solid}
  .lr-crop.tr{top:10px;right:10px;border-right:1.5px solid;border-top:1.5px solid}
  .lr-crop.bl{bottom:10px;left:10px;border-left:1.5px solid;border-bottom:1.5px solid}
  .lr-crop.br{bottom:10px;right:10px;border-right:1.5px solid;border-bottom:1.5px solid}
  .lr-pad{position:relative;z-index:1;padding:22px 26px 18px}
  .lr-mono{font-family:'DejaVu Sans Mono','Liberation Mono',monospace}
  .lr-serif{font-family:'Liberation Serif','DejaVu Serif',Georgia,serif}
  .sec-title{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#82a0ba;margin-bottom:5px;display:flex;align-items:center;gap:5px;font-weight:600}
  .field-lbl{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#82a0ba;margin-bottom:2px;display:block;font-weight:500}
  .field-val{font-size:10.5px;color:#eef3f7;font-weight:500;line-height:1.35}
  .field-val-dim{font-size:10px;color:#aebfcc;line-height:1.35}
  .div-h{border:none;border-top:1px solid #21303b;margin:.4rem 0}
  .box{background:#141d25;border:1px solid #21303b;border-radius:3px;padding:.85rem}
  .lr-day{width:20px;height:20px;border-radius:3px;display:flex;align-items:center;justify-content:center;border:1px solid #21303b;background:#0d141b}
  .lr-day .dl{font-size:8px;color:#56697b;font-weight:700;line-height:1}
  .lr-day.on{background:rgba(200,148,86,.2);border-color:#c89456}
  .lr-day.on .dl{color:#e6b074}
  .lr-tier{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:3px;border:1px solid #21303b;background:#0d141b;opacity:.35}
  .lr-tier.active{opacity:1;border-left-width:3px}
  .lr-tier .tdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:#21303b}
  .lr-tier .tn{font-size:8px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;color:#56697b}
  .lr-tier .tr{font-size:8px;color:#aebfcc}
  .gen-btn{background:rgba(200,148,86,.12);border:1px solid #c89456;color:#e6b074;font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:7px 18px;border-radius:2px;cursor:pointer}
  .gen-btn:hover{background:rgba(200,148,86,.22)}
  .json-area{width:100%;height:180px;background:#0b1014;color:#82a0ba;border:1px solid #2b3a47;border-radius:3px;padding:10px;font-family:monospace;font-size:11px;resize:vertical;outline:none}
  .json-area:focus{border-color:#c89456}
  .err-box{background:rgba(220,91,78,.12);border:1px solid rgba(220,91,78,.4);color:#f0a59b;font-family:monospace;font-size:11px;padding:8px 12px;border-radius:2px;margin-top:7px}
`;

export default function LeadRescueReport() {
  const [jsonInput, setJsonInput] = useState("");
  const [data, setData] = useState(SAMPLE);
  const [error, setError] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    fetch(`https://xofgjzfofmjziycqprhq.supabase.co/rest/v1/calls?select=*&order=created_at.desc&limit=1`, {
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8",
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZmdqemZvZm1qeml5Y3FwcmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDI1MDcsImV4cCI6MjA5NzMxODUwN30.qdn-YSphrwgMee0vdpPgE1RudBw0Z-zKOBPXmnZ4aY8`
      }
    })
    .then(r => r.json())
    .then(rows => {
      if (rows && rows.length > 0) setLiveData(rows[0].report_json);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  function handleGenerate() {
    try {
      const parsed = JSON.parse(jsonInput);
      setData(parsed);
      setError("");
      setShowInput(false);
    } catch(e) {
      setError("Invalid JSON — check the format and try again.");
    }
  }

  const d = liveData || data;
  const tier = d.priority?.tier || "Standard";
  const tc = TIER_COLORS[tier] || TIER_COLORS.Standard;
  const days = d.callback?.days || [];
  const rptNum = Math.floor(Math.random() * 9000) + 1000;
  const addrParts = (d.lead?.address_line2 || "").split(",");
  const city = addrParts[0]?.trim() || "";
  const stateZip = addrParts.slice(1).join(",").trim() || "";

  if (loading) return (
    <div style={{background:"#0b1014",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:"monospace",fontSize:11,color:"#c89456",letterSpacing:2}}>LOADING LATEST CALL...</span>
    </div>
  );

  return (
    <div style={{background:"#0b1014",minHeight:"100vh",padding:"24px 16px"}}>
      <style>{css}</style>

      <div style={{width:1000,maxWidth:"100%",margin:"0 auto 14px",display:"flex",gap:10}}>
        <button className="gen-btn lr-mono" onClick={()=>setShowInput(v=>!v)}>
          {showInput ? "▲ Hide" : "▼ Paste JSON"}
        </button>
      </div>

      {showInput && (
        <div style={{width:1000,maxWidth:"100%",margin:"0 auto 14px"}}>
          <textarea className="json-area" placeholder="Paste raw JSON from Claude extraction node…" value={jsonInput} onChange={e=>setJsonInput(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginTop:7}}>
            <button className="gen-btn" onClick={handleGenerate}>Generate →</button>
            <button className="gen-btn" style={{opacity:.6}} onClick={()=>{setData(SAMPLE);setJsonInput("");setError("");}}>Sample</button>
          </div>
          {error && <div className="err-box">{error}</div>}
        </div>
      )}

      <div className="lr-card lr-wrap">
        <div className="lr-grid-bg"/>
        <span className="lr-crop tl"/><span className="lr-crop tr"/>
        <span className="lr-crop bl"/><span className="lr-crop br"/>
        <div className="lr-pad">

          {/* HEADER */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:14,borderBottom:"1px solid #21303b",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <ShieldLogo/>
              <div>
                <div className="lr-serif" style={{fontSize:22,fontWeight:700,letterSpacing:3,color:"#eef3f7",lineHeight:1}}>LEAD RESCUE</div>
                <div className="lr-mono" style={{fontSize:8,letterSpacing:"3.5px",color:"#c89456",textTransform:"uppercase",marginTop:4}}>Never miss another call</div>
              </div>
            </div>
            <div className="lr-mono" style={{textAlign:"right",fontSize:9,lineHeight:1.9,color:"#56697b",textTransform:"uppercase",letterSpacing:1}}>
              <div>Case <span style={{color:"#aebfcc"}}>#{rptNum}</span></div>
              <div>Recv <span style={{color:"#aebfcc"}}>{fmtRecv()}</span></div>
              <div>Chan <span style={{color:"#aebfcc"}}>Inbound · Voice AI</span></div>
            </div>
          </div>

          {/* HERO */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:14,borderBottom:"1px solid #21303b",marginBottom:14}}>
            <div>
              <div className="lr-mono" style={{fontSize:8,letterSpacing:"3.5px",color:"#c89456",textTransform:"uppercase",marginBottom:5}}>Call Intelligence — Dispatch Report</div>
              <div className="lr-serif" style={{fontStyle:"italic",fontSize:32,lineHeight:.95,color:"#eef3f7"}}>
                Lead <span style={{color:"#e6b074"}}>rescued.</span>
              </div>
              <div className="lr-mono" style={{fontSize:8.5,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginTop:7}}>Missed on the main line · caught by Voice AI</div>
            </div>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"7px 13px",border:"1px solid #5cb083",background:"rgba(92,176,131,.1)",borderRadius:2}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#5cb083",boxShadow:"0 0 8px #5cb083",display:"inline-block"}}/>
              <span className="lr-mono" style={{fontSize:10,letterSpacing:2,color:"#5cb083",textTransform:"uppercase",fontWeight:700}}>Recovered</span>
            </div>
          </div>

          {/* MAIN GRID */}
          <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:10,alignItems:"start"}}>

            {/* LEFT BOX */}
            <div className="box" style={{borderLeft:"3px solid #c89456"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",border:"1px solid #c89456",background:"rgba(200,148,86,.1)",borderRadius:2,marginBottom:7}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#e6b074",display:"inline-block"}}/>
                <span className="lr-mono" style={{fontSize:8,letterSpacing:2,color:"#e6b074",textTransform:"uppercase",fontWeight:700}}>New Lead</span>
              </div>
              <div className="lr-serif" style={{fontStyle:"italic",fontSize:26,color:"#eef3f7",lineHeight:1,marginBottom:3}}>{d.lead?.name||"Unknown Caller"}</div>
              <div className="lr-mono" style={{fontSize:8,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",marginBottom:7}}>{d.lead?.descriptor||""}</div>
              <div className="div-h"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 14px",marginTop:".3rem",marginBottom:".65rem"}}>
                {[
                  {icon:"ti-device-mobile",label:"Phone",val:d.lead?.phone},
                  {icon:"ti-message-dots",label:"Preferred contact",val:d.lead?.preferred_contact},
                  {icon:"ti-at",label:"Email",val:d.lead?.email},
                  {icon:"ti-antenna",label:"How they found you",val:d.lead?.how_found},
                ].map(({icon,label,val})=>(
                  <div key={label}>
                    <span className="field-lbl lr-mono">{label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <i className={`ti ${icon}`} style={{fontSize:11,color:"#56697b"}} aria-hidden="true"/>
                      <span className="field-val lr-mono">{val||"Not provided"}</span>
                    </div>
                  </div>
                ))}
                <div style={{gridColumn:"1 / -1"}}>
                  <span className="field-lbl lr-mono">Service address</span>
                  <div style={{display:"flex",alignItems:"flex-start",gap:5}}>
                    <i className="ti ti-map-pin" style={{fontSize:11,color:"#56697b",marginTop:1}} aria-hidden="true"/>
                    <div>
                      <div className="field-val lr-mono">{d.lead?.address_line1||"Not provided"}</div>
                      <div className="field-val-dim lr-mono">{city||""}</div>
                      <div className="field-val-dim lr-mono">{stateZip||""}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="div-h"/>
              <div style={{marginTop:".55rem"}}>
                <div className="sec-title lr-mono" style={{marginBottom:7}}><i className="ti ti-file-description" aria-hidden="true"/> What happened on the call</div>
                <RecapHtml html={d.recap||""}/>
                <div style={{padding:"6px 8px",background:"#0d141b",border:"1px solid rgba(200,148,86,.15)",borderLeft:"2px solid #c89456",borderRadius:2,marginTop:7,marginBottom:6}}>
                  <div className="sec-title lr-mono" style={{fontSize:8.5,marginBottom:3,color:"#c89456"}}><i className="ti ti-eye" aria-hidden="true"/> Tone read</div>
                  <div style={{fontSize:9.5,color:"#aebfcc",lineHeight:1.55}}>{d.tone_read||""}</div>
                </div>
                <div style={{padding:"6px 8px",background:"#0d141b",border:"1px solid rgba(92,176,131,.2)",borderLeft:"2px solid #5cb083",borderRadius:2}}>
                  <div className="sec-title lr-mono" style={{fontSize:8.5,marginBottom:3,color:"#5cb083"}}><i className="ti ti-arrow-right" aria-hidden="true"/> Dispatch note</div>
                  <div style={{fontSize:9.5,color:"#eef3f7",lineHeight:1.55}}>{d.dispatch_note||""}</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>

              {/* Priority */}
              <div className="box">
                <div className="sec-title lr-mono"><i className="ti ti-alert-circle" aria-hidden="true"/> Priority</div>
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {TIERS.map(t => {
                    const isActive = t === tier;
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
              </div>

              {/* Callback */}
              <div className="box">
                <div className="sec-title lr-mono"><i className="ti ti-clock" aria-hidden="true"/> Best callback window</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <div className="lr-mono" style={{fontSize:19,color:"#e6b074",fontWeight:700,lineHeight:1}}>{d.callback?.time||"Anytime"}</div>
                  <div className="lr-mono" style={{fontSize:8,color:"#56697b",letterSpacing:1,textTransform:"uppercase"}}>{d.callback?.period||""}</div>
                </div>
                <div style={{display:"flex",gap:3,marginBottom:6}}>
                  {DAY_KEYS.map((dk,i)=>{
                    const on = isDayActive(dk,days);
                    return (
                      <div key={dk} className={`lr-day lr-mono${on?" on":""}`}>
                        <span className="dl">{DAY_LABELS[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:9,lineHeight:1.5,padding:"5px 7px",background:"#0d141b",border:"1px solid #21303b",borderRadius:2}}>
                  <span style={{color:"#eef3f7",fontWeight:700}}>"{d.callback?.note||""}"</span>
                </div>
              </div>

              {/* Problem */}
              <div className="box" style={{borderLeft:"3px solid #e6b074"}}>
                <div className="sec-title lr-mono"><i className="ti ti-tool" aria-hidden="true"/> Reported problem</div>
                <div className="lr-serif" style={{fontStyle:"italic",fontSize:17,fontWeight:700,color:"#e6b074",lineHeight:1,marginBottom:4}}>{d.problem?.title||"Unknown"}</div>
                <div style={{fontSize:9.5,color:"#aebfcc",lineHeight:1.4,marginBottom:8}}>{d.problem?.detail||""}</div>
                <div style={{display:"flex",justifyContent:"center",padding:"4px 0 5px"}}>
                  <ProblemIllustration title={d.problem?.title}/>
                </div>
                <div style={{textAlign:"center",fontSize:9,padding:"4px 7px",background:"#0d141b",border:"1px solid #21303b",borderRadius:2}}>
                  <span style={{color:"#56697b"}}>In their words: </span>
                  <span style={{color:"#eef3f7",fontWeight:700}}>"{d.problem?.quote||""}"</span>
                </div>
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:12,borderTop:"1px solid #21303b"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:5,border:"1px solid rgba(92,176,131,.4)",padding:"3px 9px",borderRadius:2,transform:"rotate(-1.5deg)"}}>
              <span style={{color:"#5cb083",fontSize:9}}>✓</span>
              <span className="lr-mono" style={{fontSize:7.5,letterSpacing:"1.5px",color:"#5cb083",textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap"}}>Reviewed · Approved for delivery</span>
            </div>
            <div className="lr-mono" style={{textAlign:"right",fontSize:8,letterSpacing:"1.5px",color:"#56697b",textTransform:"uppercase",lineHeight:1.8}}>
              <div>Call intelligence by <span style={{color:"#c89456"}}>Lead Rescue</span></div>
              <div>Generated · {fmtNow()}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
