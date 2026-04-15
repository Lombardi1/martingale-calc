import { useState, useCallback, useEffect, useRef } from "react";

const LOT_SIZE = 100;
const MC_LEVEL = 75;
const LIQ_LEVEL = 50;
const R2J = "https://api.rss2json.com/v1/api.json?rss_url=";
const FF_PROXY = "https://qhabwagcsvvluyvfztmp.supabase.co/functions/v1/ff-calendar-proxy";
const NEWS_FEEDS = [
  { name: "Investing.com", url: "https://www.investing.com/rss/news_14.rss" },
  { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/" },
];
const GOLD_KW = ["gold","xau","bullion","fed","federal reserve","cpi","inflation","nfp","non-farm","payroll","dollar","dxy","interest rate","treasury","yield","gdp","ppi","powell","fomc","jobs","employment"];
const USD_KW = ["cpi","nfp","non-farm","fed","fomc","gdp","ppi","retail sales","ism","pmi","interest rate","unemployment","payroll","powell","inflation","jobs","employment"];
const LEV = [
  { label: "1:50", value: 50 }, { label: "1:100", value: 100 },
  { label: "1:200", value: 200 }, { label: "1:500", value: 500 },
  { label: "1:1000", value: 1000 }, { label: "1:2000", value: 2000 },
];
const CONFIGS = ["OnlyBuy", "OnlySell", "BuyAndSell"];
const IT = { timeZone: "Europe/Rome" };

function marginPerLot(price, lev) { return (price * LOT_SIZE) / lev; }
function getStatus(ml) {
  if (ml >= MC_LEVEL) return "safe";
  if (ml >= LIQ_LEVEL) return "mcall";
  return "liq";
}
function ptsToLiq(eq, loss, margin, cumLots) {
  if (cumLots <= 0) return 0;
  return (eq - loss - (LIQ_LEVEL / 100) * margin) / cumLots;
}
function calcLevels(eq, price, lev, startLot, lotMult, degFrom, degMult, stepBase, stepMult) {
  const mpl = marginPerLot(price, lev);
  const rows = [];
  let cumLots = 0, lot = startLot, step = stepBase, loss = 0, calls = 0;
  for (let i = 1; i <= 25; i++) {
    cumLots = parseFloat((cumLots + lot).toFixed(4));
    const margin = cumLots * mpl;
    if (i > 1) loss = parseFloat((loss + step * (cumLots - lot)).toFixed(2));
    const free = eq - loss;
    const canOpen = free >= (lot * mpl);
    const ml = margin > 0 ? (free / margin) * 100 : 0;
    const status = getStatus(ml);
    const safe = status === "safe";
    if (!safe) calls++;
    const pts = canOpen ? ptsToLiq(eq, loss, margin, cumLots) : null;
    rows.push({ i, lot: parseFloat(lot.toFixed(4)), cumLots, margin: parseFloat(margin.toFixed(2)), loss, free: parseFloat(free.toFixed(2)), ml: parseFloat(ml.toFixed(1)), step: parseFloat(step.toFixed(1)), safe, status, canOpen, pts });
    if (calls >= 2) break;
    const nm = (i + 1) >= degFrom ? degMult : lotMult;
    lot = parseFloat((lot * nm).toFixed(4));
    step = parseFloat((step * stepMult).toFixed(2));
  }
  return rows;
}
function maxSafe(rows) { let m = 0; for (const r of rows) { if (r.safe) m = r.i; else break; } return m; }

function impactColor(impact) {
  const i = (impact || "").toLowerCase();
  if (i === "high") return "#ef4444";
  if (i === "medium") return "#f59e0b";
  return "#4b5563";
}
function impactBg(impact) {
  const i = (impact || "").toLowerCase();
  if (i === "high") return "rgba(239,68,68,.10)";
  if (i === "medium") return "rgba(245,158,11,.08)";
  return "#0d1424";
}
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return diff + "s fa";
  if (diff < 3600) return Math.floor(diff / 60) + "m fa";
  if (diff < 86400) return Math.floor(diff / 3600) + "h fa";
  return Math.floor(diff / 86400) + "g fa";
}
function toITDate(d) { return d.toLocaleDateString("it-IT", IT); }
function toITTime(d) { return d.toLocaleTimeString("it-IT", { ...IT, hour: "2-digit", minute: "2-digit" }); }
function toITDateShort(d) { return d.toLocaleDateString("it-IT", { ...IT, weekday: "short", day: "numeric", month: "short" }); }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  ::-webkit-scrollbar{display:none}
  input:focus,select:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
  .tb{flex:1;padding:11px;background:none;border:none;color:#6b7280;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;border-radius:8px;transition:all .2s;-webkit-tap-highlight-color:transparent}
  .tb.on{background:#1a2235;color:#f9fafb;box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .tb:disabled{opacity:.35;cursor:default}
  .btn{width:100%;padding:15px;border:none;border-radius:12px;background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.02em;box-shadow:0 4px 20px rgba(59,130,246,.3);transition:transform .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent}
  .btn:active{transform:scale(.97)}
  .rs td{color:#22c55e}.rmc td{color:#f59e0b}.rd td{color:#ef4444}
  .rmx{background:rgba(59,130,246,.08)!important}
  td,th{padding:8px 6px;white-space:nowrap}
  th{font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:.08em;font-weight:700}
  tbody tr{border-top:1px solid #111827}
  tbody tr:hover{background:rgba(255,255,255,.02)}
  .bs{background:#052e16;color:#22c55e;border:1px solid #14532d;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700}
  .bmc{background:#1c1200;color:#f59e0b;border:1px solid #78350f;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700}
  .bd{background:#1c0a0a;color:#ef4444;border:1px solid #7f1d1d;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700}
  .bno{background:#111827;color:#6b7280;border:1px solid #1f2937;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700}
  .su{animation:su .3s ease-out}
  @keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .pu{animation:pu 1.5s infinite}
  @keyframes pu{0%,100%{opacity:1}50%{opacity:.3}}
  .lbl{font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:6px}
  .divider{height:1px;background:#111827;margin:4px 0}
  .sec{font-size:10px;color:#3b82f6;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
  .card{background:#0d1424;border:1px solid #1a2235;border-radius:12px;padding:12px 14px}
  .rfbtn{background:rgba(251,191,36,.08);border:1px solid #78350f;border-radius:8px;padding:8px 12px;color:#fbbf24;font-size:16px;cursor:pointer;line-height:1;transition:all .2s}
  .rfbtn:active{transform:scale(.93)}
  .ibtn{background:rgba(59,130,246,.08);border:1px solid #1f2937;border-radius:8px;padding:8px 12px;color:#6b7280;font-size:16px;cursor:pointer;line-height:1;transition:all .2s}
  .ibtn:active{transform:scale(.93)}
  .news-card{background:#0d1424;border:1px solid #1a2235;border-radius:12px;padding:12px 14px;margin-bottom:8px;transition:border-color .2s;text-decoration:none;display:block;color:inherit}
  .news-card:hover{border-color:#3b82f6}
  .sec-label{font-size:10px;color:#3b82f6;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin:14px 0 8px}
  .navbtn{flex:1;padding:10px 4px;background:none;border:none;color:#4b5563;font-size:10px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .2s;-webkit-tap-highlight-color:transparent;text-transform:uppercase;letter-spacing:.04em}
  .navbtn.act{color:#3b82f6}
`;

function BottomNav({ page, setPage }) {
  return (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#0a0f1a",borderTop:"1px solid #111827",display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)" }}>
      <button className={"navbtn"+(page==="calc"?" act":"")} onClick={()=>setPage("calc")}><span style={{fontSize:20}}>&#9889;</span>Calc</button>
      <button className={"navbtn"+(page==="news"?" act":"")} onClick={()=>setPage("news")}><span style={{fontSize:20}}>&#128240;</span>News</button>
    </div>
  );
}

function EventCard({ e }) {
  const name = e.title || e.name || e.event || "Evento";
  const impact = e.impact || "";
  const date = e.date ? new Date(e.date) : null;
  const timeStr = date ? toITTime(date) : "";
  const dateStr = date ? toITDateShort(date) : "";
  const todayIT = toITDate(new Date());
  const isToday = date ? toITDate(date) === todayIT : false;
  const actual = (e.actual != null && e.actual !== "") ? e.actual : null;
  const forecast = (e.forecast != null && e.forecast !== "") ? e.forecast : null;
  const previous = (e.previous != null && e.previous !== "") ? e.previous : null;
  return (
    <div style={{background:impactBg(impact),border:"1px solid "+impactColor(impact)+"33",borderLeft:"3px solid "+impactColor(impact),borderRadius:10,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#f9fafb",lineHeight:1.3}}>{name}</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:3}}>
            {isToday ? <span style={{color:"#ef4444",fontWeight:700}}>OGGI</span> : dateStr}
            {timeStr ? " \u00b7 " + timeStr : ""} &middot; USD
          </div>
        </div>
        <span style={{background:impactBg(impact),border:"1px solid "+impactColor(impact)+"55",color:impactColor(impact),borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>
          {impact.toUpperCase() || "\u2014"}
        </span>
      </div>
      {(actual !== null || forecast !== null || previous !== null) && (
        <div style={{display:"flex",gap:12,marginTop:8}}>
          {actual !== null && <div style={{fontSize:10}}><span style={{color:"#4b5563"}}>Actual </span><span style={{color:"#22c55e",fontWeight:700}}>{actual}</span></div>}
          {forecast !== null && <div style={{fontSize:10}}><span style={{color:"#4b5563"}}>Prev. </span><span style={{color:"#f9fafb",fontWeight:600}}>{forecast}</span></div>}
          {previous !== null && <div style={{fontSize:10}}><span style={{color:"#4b5563"}}>Prec. </span><span style={{color:"#6b7280"}}>{previous}</span></div>}
        </div>
      )}
    </div>
  );
}

function NewsPage() {
  const [calEvents, setCalEvents] = useState([]);
  const [news, setNews] = useState([]);
  const [calStatus, setCalStatus] = useState("idle");
  const [newsStatus, setNewsStatus] = useState("idle");
  const [tab, setTab] = useState("calendar");
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchCalendar = useCallback(async () => {
    setCalStatus("loading");
    try {
      const r = await fetch(FF_PROXY);
      if (!r.ok) throw new Error("status " + r.status);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      const filtered = arr.filter(function(e) {
        const cur = (e.currency || "").toUpperCase();
        const imp = (e.impact || "").toLowerCase();
        const name = (e.title || e.name || e.event || "").toLowerCase();
        const isUSD = cur === "USD";
        const isHighMed = imp === "high" || imp === "medium";
        const isRelevant = USD_KW.some(function(k) { return name.includes(k); }) || imp === "high";
        return isUSD && isHighMed && isRelevant;
      });
      filtered.sort(function(a,b) { return new Date(a.date) - new Date(b.date); });
      setCalEvents(filtered.length > 0 ? filtered : arr.filter(function(e) { return (e.currency||"").toUpperCase()==="USD"; }).slice(0,15));
      setCalStatus("ok");
      setLastUpdate(new Date());
    } catch(err) {
      setCalStatus("error");
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setNewsStatus("loading");
    const all = [];
    for (let fi = 0; fi < NEWS_FEEDS.length; fi++) {
      const feed = NEWS_FEEDS[fi];
      try {
        const r = await fetch(R2J + encodeURIComponent(feed.url) + "&count=20");
        const d = await r.json();
        if (d.status === "ok" && Array.isArray(d.items)) {
          for (let ii = 0; ii < d.items.length; ii++) {
            const item = d.items[ii];
            const text = ((item.title||"") + " " + (item.description||"")).toLowerCase();
            if (GOLD_KW.some(function(k) { return text.includes(k); })) {
              all.push({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                desc: (item.description||"").replace(/<[^>]+>/g,"").substring(0,200),
                source: feed.name
              });
            }
          }
        }
      } catch(e) {}
    }
    all.sort(function(a,b) { return b.pubDate - a.pubDate; });
    setNews(all);
    setNewsStatus(all.length > 0 ? "ok" : "empty");
    setLastUpdate(new Date());
  }, []);

  useEffect(function() {
    fetchCalendar();
    fetchNews();
    const iv = setInterval(function() { fetchCalendar(); fetchNews(); }, 5*60*1000);
    return function() { clearInterval(iv); };
  }, [fetchCalendar, fetchNews]);

  const todayStr = toITDate(new Date());
  const todayEvents = calEvents.filter(function(e) { return e.date && toITDate(new Date(e.date)) === todayStr; });
  const upcomingEvents = calEvents.filter(function(e) { return e.date && toITDate(new Date(e.date)) !== todayStr; });

  return (
    <div>
      <div style={{background:"#0a0f1a",borderBottom:"1px solid #111827",padding:"14px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(10px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>&#128240;</div>
            <div>
              <div style={{fontSize:15,fontWeight:800,letterSpacing:"-.02em"}}>News & Calendario</div>
              <div style={{fontSize:10,color:"#4b5563",marginTop:1}}>XAUUSD &middot; Ora italiana</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {lastUpdate && <div style={{fontSize:9,color:"#374151"}}>{toITTime(lastUpdate)}</div>}
            <button className="ibtn" onClick={function(){fetchCalendar();fetchNews();}}>&#8635;</button>
          </div>
        </div>
      </div>

      {todayEvents.length > 0 && (
        <div style={{margin:"10px 12px 0",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>&#9888;&#65039;</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>{todayEvents.length} eventi ad alto impatto OGGI</div>
            <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>
              {todayEvents.map(function(e){return e.title||e.name||e.event;}).filter(Boolean).slice(0,3).join(" \u00b7 ")}
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:4,margin:"10px 12px 0",background:"#0d1424",border:"1px solid #111827",borderRadius:10,padding:3}}>
        <button className={"tb"+(tab==="calendar"?" on":"")} onClick={function(){setTab("calendar");}}>
          &#128197; Calendario{calEvents.length>0?" ("+calEvents.length+")":""}
        </button>
        <button className={"tb"+(tab==="news"?" on":"")} onClick={function(){setTab("news");}}>
          &#128240; Notizie{news.length>0?" ("+news.length+")":""}
        </button>
      </div>

      {tab==="calendar" && (
        <div className="su" style={{padding:"12px 12px 100px"}}>
          {calStatus==="loading" && <div style={{textAlign:"center",padding:40,color:"#4b5563",fontSize:13}} className="pu">Caricamento calendario...</div>}
          {calStatus==="error" && (
            <div style={{textAlign:"center",padding:40}}>
              <div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>Calendario non disponibile</div>
              <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:12,padding:"8px 16px",background:"#1d4ed8",color:"#fff",borderRadius:8,fontSize:12,fontWeight:600,textDecoration:"none"}}>Apri ForexFactory &#8594;</a>
            </div>
          )}
          {calStatus==="ok" && calEvents.length===0 && <div style={{textAlign:"center",padding:40,color:"#4b5563",fontSize:13}}>Nessun evento rilevante questa settimana</div>}
          {calStatus==="ok" && todayEvents.length>0 && (
            <div>
              <div className="sec-label">&#128308; Oggi</div>
              {todayEvents.map(function(e,i){return <EventCard key={i} e={e}/>;} )}
            </div>
          )}
          {calStatus==="ok" && upcomingEvents.length>0 && (
            <div>
              <div className="sec-label">&#128198; Prossimi</div>
              {upcomingEvents.map(function(e,i){return <EventCard key={i} e={e}/>;} )}
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",fontSize:10,color:"#4b5563"}}>
            <span style={{color:"#ef4444",fontWeight:700}}>&#9632; HIGH</span>
            <span style={{color:"#f59e0b",fontWeight:700}}>&#9632; MEDIUM</span>
            <span>Fonte: ForexFactory &middot; USD only &middot; Ora italiana</span>
          </div>
        </div>
      )}

      {tab==="news" && (
        <div className="su" style={{padding:"12px 12px 100px"}}>
          {newsStatus==="loading" && <div style={{textAlign:"center",padding:40,color:"#4b5563",fontSize:13}} className="pu">Caricamento notizie...</div>}
          {newsStatus==="empty" && <div style={{textAlign:"center",padding:40,color:"#4b5563",fontSize:13}}>Nessuna notizia gold/XAU trovata</div>}
          {(newsStatus==="ok"||newsStatus==="empty") && news.map(function(n,i){
            return (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="news-card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#f9fafb",lineHeight:1.4,flex:1}}>{n.title}</div>
                  <div style={{fontSize:9,color:"#4b5563",whiteSpace:"nowrap",marginTop:2}}>{timeAgo(n.pubDate)}</div>
                </div>
                {n.desc && <div style={{fontSize:11,color:"#6b7280",marginTop:5,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{n.desc}</div>}
                <div style={{marginTop:7,display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{background:"#111827",border:"1px solid #1f2937",borderRadius:4,padding:"1px 6px",fontSize:9,color:"#6b7280",fontWeight:600}}>{n.source}</span>
                  <span style={{fontSize:9,color:"#3b82f6"}}>&#8594; Apri</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("calc");
  const [equity, setEquity] = useState("2400");
  const [price, setPrice] = useState("3100");
  const [lev, setLev] = useState(500);
  const [startLot, setStartLot] = useState("0.01");
  const [lotMult, setLotMult] = useState("2");
  const [degFrom, setDegFrom] = useState("5");
  const [degMult, setDegMult] = useState("1.75");
  const [stepBase, setStepBase] = useState("1300");
  const [stepMult, setStepMult] = useState("1.05");
  const [config, setConfig] = useState("OnlyBuy");
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("calc");
  const [goldSt, setGoldSt] = useState("idle");
  const [updated, setUpdated] = useState(null);
  const ref = useRef(null);

  const fetchGold = useCallback(async function() {
    setGoldSt("loading");
    const apis = [
      async function() {
        const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json");
        const d = await r.json();
        const p = d && d.xau && d.xau.usd;
        if (!p || p < 500) throw new Error("bad");
        return p;
      },
      async function() {
        const r = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT");
        const d = await r.json();
        const p = d && d.result && d.result.list && d.result.list[0] && d.result.list[0].lastPrice;
        if (!p) throw new Error("no price");
        return Number(p);
      },
    ];
    for (let i = 0; i < apis.length; i++) {
      try {
        const p = await apis[i]();
        if (p && !isNaN(p) && p > 500 && p < 15000) {
          setPrice(Number(p).toFixed(2));
          setUpdated(new Date());
          setGoldSt("live");
          return;
        }
      } catch(e) {}
    }
    setGoldSt("error");
  }, []);

  useEffect(function() {
    fetchGold();
    const iv = setInterval(fetchGold, 60000);
    return function() { clearInterval(iv); };
  }, [fetchGold]);

  const calculate = useCallback(function() {
    const result = calcLevels(Number(equity),Number(price),Number(lev),Number(startLot),Number(lotMult),Number(degFrom),Number(degMult),Number(stepBase),Number(stepMult));
    setRows(result);
    setTab("table");
    setTimeout(function() { if (ref.current) ref.current.scrollIntoView({ behavior:"smooth" }); }, 80);
  }, [equity,price,lev,startLot,lotMult,degFrom,degMult,stepBase,stepMult]);

  const ms = rows ? maxSafe(rows) : 0;
  const mpl = marginPerLot(Number(price), Number(lev));
  const safeRow = rows && rows[ms-1];
  const dotColor = goldSt==="live"?"#22c55e":goldSt==="loading"?"#f59e0b":goldSt==="error"?"#ef4444":"#6b7280";
  const bannerColor = ms>=7?"#22c55e":ms>=5?"#f59e0b":"#ef4444";
  const inp = {background:"#0d1424",border:"1px solid #1f2937",borderRadius:10,padding:"12px 14px",color:"#f9fafb",fontSize:15,fontFamily:"inherit",outline:"none",width:"100%",WebkitAppearance:"none",MozAppearance:"textfield",transition:"border-color .2s"};
  const selArrow = "url(%22data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E%22)";

  return (
    <div style={{minHeight:"100svh",background:"#070c17",color:"#f9fafb",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",maxWidth:480,margin:"0 auto"}}>
      <style>{CSS}</style>

      {page==="news" ? <NewsPage/> : (
        <div>
          <div style={{background:"#0a0f1a",borderBottom:"1px solid #111827",padding:"14px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(10px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,background:"linear-gradient(135deg,#b8860b,#ffd700)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>&#9889;</div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,letterSpacing:"-.02em"}}>Martingale Calc</div>
                  <div style={{fontSize:10,color:"#4b5563",marginTop:1}}>XAUUSD &middot; Degressive</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:dotColor,boxShadow:goldSt==="live"?"0 0 6px #22c55e":"none"}} className={goldSt==="loading"?"pu":""}/>
                  <span style={{fontSize:10,color:dotColor,fontWeight:700,textTransform:"uppercase"}}>
                    {goldSt==="live"?"Live":goldSt==="loading"?"...":goldSt==="error"?"Offline":"-"}
                  </span>
                </div>
                {updated && <div style={{fontSize:9,color:"#374151",marginTop:2}}>{toITTime(updated)}</div>}
              </div>
            </div>
          </div>

          <div style={{margin:"12px 12px 0",background:"linear-gradient(135deg,#1a1400,#1f1a00)",border:"1px solid #2d2200",borderRadius:14,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:9,color:"#78350f",textTransform:"uppercase",letterSpacing:".1em",fontWeight:700,marginBottom:4}}>XAU / USD &middot; Spot</div>
                <div style={{fontSize:32,fontWeight:800,color:"#fbbf24",letterSpacing:"-.03em",lineHeight:1}}>
                  {Number(price||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                </div>
                <div style={{fontSize:11,color:"#6b5a2a",marginTop:5}}>Margine/lot @ 1:{lev} <span style={{color:"#d97706",fontWeight:700}}>{mpl.toFixed(2)}</span></div>
              </div>
              <button className="rfbtn" onClick={fetchGold}>&#8635;</button>
            </div>
            <div style={{marginTop:10}}>
              <div className="lbl">Override manuale</div>
              <input type="number" value={price} inputMode="decimal" onChange={function(e){setPrice(e.target.value);setGoldSt("error");}} style={{...inp,background:"rgba(0,0,0,.25)",border:"1px solid #2d2200",color:"#fbbf24"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:4,margin:"10px 12px 0",background:"#0d1424",border:"1px solid #111827",borderRadius:10,padding:3}}>
            <button className={"tb"+(tab==="calc"?" on":"")} onClick={function(){setTab("calc");}}>&#9881;&#65039; Parametri</button>
            <button className={"tb"+(tab==="table"?" on":"")} onClick={function(){setTab("table");}} disabled={!rows}>
              &#128202; Risultati{rows?" ("+ms+" safe)":""}
            </button>
          </div>

          {tab==="calc" && (
            <div style={{padding:"12px 12px 120px",display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="card"><div className="lbl">Equity ($)</div><input type="number" value={equity} inputMode="decimal" onChange={function(e){setEquity(e.target.value);}} style={inp}/></div>
                <div className="card"><div className="lbl">Leverage</div>
                  <select value={lev} onChange={function(e){setLev(Number(e.target.value));}} style={{...inp,cursor:"pointer",appearance:"none",backgroundImage:selArrow,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center"}}>
                    {LEV.map(function(o){return <option key={o.value} value={o.value}>{o.label}</option>;})}
                  </select>
                </div>
              </div>
              <div className="card"><div className="lbl">Configuration</div>
                <select value={config} onChange={function(e){setConfig(e.target.value);}} style={{...inp,cursor:"pointer",appearance:"none",backgroundImage:selArrow,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center"}}>
                  {CONFIGS.map(function(c){return <option key={c} value={c}>{c}</option>;})}
                </select>
              </div>
              <div className="divider"/><div className="sec">Lot Sizing</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="card"><div className="lbl">Start Lot</div><input type="number" value={startLot} inputMode="decimal" step="0.01" onChange={function(e){setStartLot(e.target.value);}} style={inp}/></div>
                <div className="card"><div className="lbl">{"Lot Mult (1-"+(Number(degFrom)-1)+")"}</div><input type="number" value={lotMult} inputMode="decimal" step="0.1" onChange={function(e){setLotMult(e.target.value);}} style={inp}/></div>
              </div>
              <div className="divider"/><div className="sec">Degressive Martingale</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="card"><div className="lbl">Da livello</div><input type="number" value={degFrom} inputMode="decimal" onChange={function(e){setDegFrom(e.target.value);}} style={inp}/></div>
                <div className="card"><div className="lbl">Moltiplicatore</div><input type="number" value={degMult} inputMode="decimal" step="0.05" onChange={function(e){setDegMult(e.target.value);}} style={inp}/></div>
              </div>
              <div className="divider"/><div className="sec">Grid Step</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="card"><div className="lbl">Step base (pts)</div><input type="number" value={stepBase} inputMode="decimal" onChange={function(e){setStepBase(e.target.value);}} style={inp}/></div>
                <div className="card"><div className="lbl">Step mult</div><input type="number" value={stepMult} inputMode="decimal" step="0.01" onChange={function(e){setStepMult(e.target.value);}} style={inp}/></div>
              </div>
              <button className="btn" onClick={calculate} style={{marginTop:4}}>&#9889; Calcola livelli</button>
            </div>
          )}

          {tab==="table" && rows && (
            <div ref={ref} className="su" style={{padding:"12px 0 120px"}}>
              <div style={{margin:"0 12px 12px",background:"#0a0f1a",border:"2px solid "+bannerColor,borderRadius:16,padding:"20px 16px",textAlign:"center"}}>
                <div style={{fontSize:72,fontWeight:800,color:bannerColor,lineHeight:1,letterSpacing:"-.04em"}}>{ms}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:6,textTransform:"uppercase",letterSpacing:".12em",fontWeight:600}}>Livelli Sicuri Massimi</div>
                <div style={{fontSize:10,color:"#374151",marginTop:4}}>XAU ${Number(price).toLocaleString()} &middot; 1:{lev} &middot; ${Number(equity).toLocaleString()} equity</div>
              </div>
              {safeRow && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"0 12px 12px"}}>
                  {[{l:"Margin/lot",v:"$"+mpl.toFixed(2)},{l:"Margin Level",v:safeRow.ml.toFixed(1)+"%"},{l:"Float Loss",v:"$"+safeRow.loss.toFixed(2)},{l:"Free Margin",v:"$"+safeRow.free.toFixed(2)}].map(function(x){return (
                    <div key={x.l} className="card">
                      <div style={{fontSize:9,color:"#4b5563",textTransform:"uppercase",letterSpacing:".08em",fontWeight:700,marginBottom:5}}>{x.l} @ max</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#f9fafb"}}>{x.v}</div>
                    </div>
                  );})}
                </div>
              )}
              <div style={{margin:"0 12px 10px",padding:"8px 12px",background:"#0d1424",borderRadius:8,border:"1px solid #111827",fontSize:10,color:"#4b5563",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <span><span className="bs">SAFE</span> ML &gt;{MC_LEVEL}%</span>
                <span><span className="bmc">M.CALL</span> {LIQ_LEVEL}&ndash;{MC_LEVEL}%</span>
                <span><span className="bd">LIQ</span> ML &lt;{LIQ_LEVEL}%</span>
                <span><span className="bno">NO OPEN</span></span>
              </div>
              <div style={{overflowX:"auto",marginBottom:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:520}}>
                  <thead><tr style={{background:"#0a0f1a"}}>
                    <th style={{textAlign:"left",paddingLeft:12}}>#</th>
                    <th>Lot</th><th>Tot</th><th>Margin</th><th>Loss</th><th>ML%</th>
                    <th style={{color:"#3b82f6"}}>Apre?</th>
                    <th style={{color:"#ef4444",paddingRight:12}}>Pts&#8594;Liq</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(function(r){return (
                      <tr key={r.i} className={(r.status==="safe"?"rs":r.status==="mcall"?"rmc":"rd")+(r.i===ms?" rmx":"")}>
                        <td style={{fontWeight:r.i===ms?800:400,paddingLeft:12}}>{r.i}{r.i===ms?" \u2605":""}</td>
                        <td>{r.lot.toFixed(3)}</td><td>{r.cumLots.toFixed(3)}</td>
                        <td>${r.margin.toFixed(0)}</td><td>${r.loss.toFixed(0)}</td>
                        <td style={{fontWeight:700}}>{r.ml.toFixed(0)}%</td>
                        <td>{r.canOpen?<span className="bs">S&#204;</span>:<span className="bno">NO</span>}</td>
                        <td style={{paddingRight:12}}>
                          {r.canOpen && r.pts !== null
                            ? <span style={{fontWeight:700,color:r.pts>500?"#22c55e":r.pts>0?"#f59e0b":"#ef4444"}}>{r.pts>0?r.pts.toFixed(0):"&#8804;0"}</span>
                            : <span style={{color:"#374151"}}>&#8212;</span>}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
              <div style={{margin:"0 12px 10px",padding:"8px 12px",background:"#0d1424",borderRadius:8,border:"1px solid #111827",fontSize:10,color:"#4b5563",display:"flex",flexWrap:"wrap",gap:6}}>
                <span>Lot x{lotMult} (lv 1-{Number(degFrom)-1})</span><span>&middot;</span>
                <span>Deg. x{degMult} da lv.{degFrom}</span><span>&middot;</span><span>Step x{stepMult}/lv</span>
              </div>
              <div style={{padding:"0 12px"}}>
                <button className="btn" onClick={function(){setTab("calc");}} style={{background:"linear-gradient(135deg,#1a2235,#1f2937)",boxShadow:"none",border:"1px solid #1f2937"}}>&#8592; Modifica parametri</button>
              </div>
            </div>
          )}
        </div>
      )}
      <BottomNav page={page} setPage={setPage}/>
    </div>
  );
}
