import { useState, useCallback, useEffect, useRef } from "react";
const LEV = [
  { label: "1:50", value: 50 },
  { label: "1:100", value: 100 },
  { label: "1:200", value: 200 },
  { label: "1:500", value: 500 },
  { label: "1:1000", value: 1000 },
  { label: "1:2000", value: 2000 },
];
const CONFIGS = ["OnlyBuy", "OnlySell", "BuyAndSell"];
const LOT_SIZE = 100;
const MC_LEVEL = 75;
const LIQ_LEVEL = 50;
function marginPerLot(price, lev) { return (price * LOT_SIZE) / lev; }
function getStatus(ml) {
  if (ml >= MC_LEVEL) return "safe";
  if (ml >= LIQ_LEVEL) return "mcall";
  return "liq";
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
    const ml = margin > 0 ? (free / margin) * 100 : 0;
    const status = getStatus(ml);
    const safe = status === "safe";
    if (!safe) calls++;
    rows.push({ i, lot: parseFloat(lot.toFixed(4)), cumLots, margin: parseFloat(margin.toFixed(2)), loss, free: parseFloat(free.toFixed(2)), ml: parseFloat(ml.toFixed(1)), step: parseFloat(step.toFixed(1)), safe, status });
    if (calls >= 2) break;
    const nm = (i + 1) >= degFrom ? degMult : lotMult;
    lot = parseFloat((lot * nm).toFixed(4));
    step = parseFloat((step * stepMult).toFixed(2));
  }
  return rows;
}
function maxSafe(rows) { let m = 0; for (const r of rows) { if (r.safe) m = r.i; else break; } return m; }
export default function App() {
  const [equity, setEquity] = useState("2400");
  const [price, setPrice] = useState("3100");
  const [lev, setLev] = useState(500);
  const [startLot, setStartLot] = useState("0.01");
  const [lotMult, setLotMult] = useState("2");
  const [degFrom, setDegFrom] = useState("5");
  const [degMult, setDegMult] = useState("1.75");
  const [stepBase, setStepBase] = useState("130");
  const [stepMult, setStepMult] = useState("1.05");
  const [config, setConfig] = useState("OnlyBuy");
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState("calc");
  const [goldSt, setGoldSt] = useState("idle");
  const [updated, setUpdated] = useState(null);
  const ref = useRef(null);
  const fetchGold = useCallback(async () => {
    setGoldSt("loading");
    const apis = [
      async () => {
        const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json");
        const d = await r.json();
        const p = d?.xau?.usd;
        if (!p || p < 500) throw new Error("bad rate");
        return p;
      },
      async () => {
        const r = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT");
        const d = await r.json();
        const p = d?.result?.list?.[0]?.lastPrice;
        if (!p) throw new Error("no price");
        return Number(p);
      },
    ];
    for (const api of apis) {
      try {
        const p = await api();
        if (p && !isNaN(p) && p > 500 && p < 15000) {
          setPrice(Number(p).toFixed(2));
          setUpdated(new Date());
          setGoldSt("live");
          return;
        }
      } catch (_) {}
    }
    setGoldSt("error");
  }, []);
  useEffect(() => { fetchGold(); const iv = setInterval(fetchGold, 60000); return () => clearInterval(iv); }, [fetchGold]);
  const calculate = useCallback(() => {
    const result = calcLevels(Number(equity), Number(price), Number(lev), Number(startLot), Number(lotMult), Number(degFrom), Number(degMult), Number(stepBase), Number(stepMult));
    setRows(result);
    setTab("table");
    setTimeout(() => ref.current && ref.current.scrollIntoView({ behavior: "smooth" }), 80);
  }, [equity, price, lev, startLot, lotMult, degFrom, degMult, stepBase, stepMult]);
  const ms = rows ? maxSafe(rows) : 0;
  const mpl = marginPerLot(Number(price), Number(lev));
  const safeRow = rows && rows[ms - 1];
  const dotColor = goldSt === "live" ? "#22c55e" : goldSt === "loading" ? "#f59e0b" : goldSt === "error" ? "#ef4444" : "#6b7280";
  const bannerColor = ms >= 7 ? "#22c55e" : ms >= 5 ? "#f59e0b" : "#ef4444";
  const inp = { background: "#0d1424", border: "1px solid #1f2937", borderRadius: 10, padding: "12px 14px", color: "#f9fafb", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", WebkitAppearance: "none", MozAppearance: "textfield", transition: "border-color .2s" };
  const selArrow = "url(%22data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E%22)";
  return (
    <div style={{ minHeight: "100svh", background: "#070c17", color: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        ::-webkit-scrollbar{display:none}
        input:focus,select:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
        .tb{flex:1;padding:11px;background:none;border:none;color:#6b7280;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;border-radius:8px;transition:all .2s;-webkit-tap-highlight-color:transparent;letter-spacing:.01em}
        .tb.on{background:#1a2235;color:#f9fafb;box-shadow:0 1px 3px rgba(0,0,0,.4)}
        .tb:disabled{opacity:.35;cursor:default}
        .btn{width:100%;padding:15px;border:none;border-radius:12px;background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.02em;box-shadow:0 4px 20px rgba(59,130,246,.3);transition:transform .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent}
        .btn:active{transform:scale(.97);box-shadow:0 2px 10px rgba(59,130,246,.2)}
        .rs td{color:#22c55e}.rmc td{color:#f59e0b}.rd td{color:#ef4444}
        .rmx{background:rgba(59,130,246,.08)!important}
        td,th{padding:9px 8px;white-space:nowrap}
        th{font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.08em;font-weight:700}
        tbody tr{border-top:1px solid #111827}
        tbody tr:hover{background:rgba(255,255,255,.02)}
        .bs{background:#052e16;color:#22c55e;border:1px solid #14532d;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700;letter-spacing:.03em}
        .bmc{background:#1c1200;color:#f59e0b;border:1px solid #78350f;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700;letter-spacing:.03em}
        .bd{background:#1c0a0a;color:#ef4444;border:1px solid #7f1d1d;border-radius:4px;padding:2px 5px;font-size:9px;font-weight:700;letter-spacing:.03em}
        .su{animation:su .3s ease-out}
        @keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .pu{animation:pu 1.5s infinite}
        @keyframes pu{0%,100%{opacity:1}50%{opacity:.3}}
        .lbl{font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:6px}
        .divider{height:1px;background:#111827;margin:2px 0}
        .sec{font-size:10px;color:#3b82f6;text-transform:uppercase;letter-spacing:.1em;font-weight:700}
        .card{background:#0d1424;border:1px solid #1a2235;border-radius:12px;padding:12px 14px}
        .rfbtn{background:rgba(251,191,36,.08);border:1px solid #78350f;border-radius:8px;padding:8px 12px;color:#fbbf24;font-size:16px;cursor:pointer;line-height:1;transition:all .2s;-webkit-tap-highlight-color:transparent}
        .rfbtn:active{background:rgba(251,191,36,.18);transform:scale(.93)}
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #111827", padding: "14px 18px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#b8860b,#ffd700)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {"⚡"}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>Martingale Calc</div>
              <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1, letterSpacing: ".05em" }}>XAUUSD {"·"} Degressive</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, boxShadow: goldSt === "live" ? "0 0 6px #22c55e" : "none" }} className={goldSt === "loading" ? "pu" : ""} />
              <span style={{ fontSize: 10, color: dotColor, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>
                {goldSt === "live" ? "Live" : goldSt === "loading" ? "..." : goldSt === "error" ? "Offline" : "-"}
              </span>
            </div>
            {updated && <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{updated.toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>

      {/* GOLD CARD */}
      <div style={{ margin: "12px 12px 0", background: "linear-gradient(135deg,#1a1400,#1f1a00)", border: "1px solid #2d2200", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, color: "#78350f", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, marginBottom: 4 }}>XAU / USD {"·"} Spot</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fbbf24", letterSpacing: "-.03em", lineHeight: 1 }}>
              {Number(price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: "#6b5a2a", marginTop: 5 }}>
              Margine/lot @ 1:{lev} {<span style={{ color: "#d97706", fontWeight: 700 }}>{mpl.toFixed(2)}</span>}
            </div>
          </div>
          <button className="rfbtn" onClick={fetchGold}>{"↻"}</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="lbl">Override manuale</div>
          <input type="number" value={price} inputMode="decimal" onChange={e => { setPrice(e.target.value); setGoldSt("error"); }} style={{ ...inp, background: "rgba(0,0,0,.25)", border: "1px solid #2d2200", color: "#fbbf24" }} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, margin: "10px 12px 0", background: "#0d1424", border: "1px solid #111827", borderRadius: 10, padding: 3 }}>
        <button className={"tb" + (tab === "calc" ? " on" : "")} onClick={() => setTab("calc")}>{"⚙️"} Parametri</button>
        <button className={"tb" + (tab === "table" ? " on" : "")} onClick={() => setTab("table")} disabled={!rows}>
          {"📊"} Risultati{rows ? ` (${ms} safe)` : ""}
        </button>
      </div>

      {/* PARAMS */}
      {tab === "calc" && (
        <div style={{ padding: "12px 12px 120px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="card">
              <div className="lbl">Equity ($)</div>
              <input type="number" value={equity} inputMode="decimal" onChange={e => setEquity(e.target.value)} style={inp} />
            </div>
            <div className="card">
              <div className="lbl">Leverage</div>
              <select value={lev} onChange={e => setLev(Number(e.target.value))} style={{ ...inp, cursor: "pointer", appearance: "none", backgroundImage: selArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                {LEV.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="lbl">Configuration</div>
            <select value={config} onChange={e => setConfig(e.target.value)} style={{ ...inp, cursor: "pointer", appearance: "none", backgroundImage: selArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
              {CONFIGS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="divider" />
          <div className="sec">Lot Sizing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="card"><div className="lbl">Start Lot</div><input type="number" value={startLot} inputMode="decimal" step="0.01" onChange={e => setStartLot(e.target.value)} style={inp} /></div>
            <div className="card"><div className="lbl">Lot Mult (1-{Number(degFrom)-1})</div><input type="number" value={lotMult} inputMode="decimal" step="0.1" onChange={e => setLotMult(e.target.value)} style={inp} /></div>
          </div>

          <div className="divider" />
          <div className="sec">Degressive Martingale</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="card"><div className="lbl">Da livello</div><input type="number" value={degFrom} inputMode="decimal" onChange={e => setDegFrom(e.target.value)} style={inp} /></div>
            <div className="card"><div className="lbl">Moltiplicatore</div><input type="number" value={degMult} inputMode="decimal" step="0.05" onChange={e => setDegMult(e.target.value)} style={inp} /></div>
          </div>

          <div className="divider" />
          <div className="sec">Grid Step</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="card"><div className="lbl">Step base (pts)</div><input type="number" value={stepBase} inputMode="decimal" onChange={e => setStepBase(e.target.value)} style={inp} /></div>
            <div className="card"><div className="lbl">Step mult</div><input type="number" value={stepMult} inputMode="decimal" step="0.01" onChange={e => setStepMult(e.target.value)} style={inp} /></div>
          </div>

          <button className="btn" onClick={calculate} style={{ marginTop: 4 }}>{"⚡"} Calcola livelli</button>
        </div>
      )}

      {/* RESULTS */}
      {tab === "table" && rows && (
        <div ref={ref} className="su" style={{ padding: "12px 0 120px" }}>
          <div style={{ margin: "0 12px 12px", background: "#0a0f1a", border: `2px solid ${bannerColor}`, borderRadius: 16, padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: bannerColor, lineHeight: 1, letterSpacing: "-.04em" }}>{ms}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>Livelli Sicuri Massimi</div>
            <div style={{ fontSize: 10, color: "#374151", marginTop: 4 }}>XAU ${Number(price).toLocaleString()} {"·"} 1:{lev} {"·"} ${Number(equity).toLocaleString()} equity</div>
          </div>

          {safeRow && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "0 12px 12px" }}>
              {[
                { l: "Margin/lot", v: `$${mpl.toFixed(2)}` },
                { l: "Margin Level", v: `${safeRow.ml.toFixed(1)}%` },
                { l: "Float Loss", v: `$${safeRow.loss.toFixed(2)}` },
                { l: "Free Margin", v: `$${safeRow.free.toFixed(2)}` },
              ].map(({ l, v }) => (
                <div key={l} className="card">
                  <div style={{ fontSize: 9, color: "#4b5563", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, marginBottom: 5 }}>{l} @ max</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f9fafb" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* LEGEND */}
          <div style={{ margin: "0 12px 10px", padding: "8px 12px", background: "#0d1424", borderRadius: 8, border: "1px solid #111827", fontSize: 10, color: "#4b5563", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span><span className="bs">SAFE</span> ML &gt; {MC_LEVEL}%</span>
            <span><span className="bmc">M.CALL</span> ML {LIQ_LEVEL}–{MC_LEVEL}%</span>
            <span><span className="bd">LIQ</span> ML &lt; {LIQ_LEVEL}%</span>
          </div>

          <div style={{ overflowX: "auto", marginBottom: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
              <thead>
                <tr style={{ background: "#0a0f1a" }}>
                  <th style={{ textAlign: "left", paddingLeft: 12 }}>#</th>
                  <th>Lot</th><th>Tot</th><th>Step</th><th>Margin</th><th>Loss</th><th>Lvl%</th>
                  <th style={{ paddingRight: 12 }}>St.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.i} className={(r.status === "safe" ? "rs" : r.status === "mcall" ? "rmc" : "rd") + (r.i === ms ? " rmx" : "")}>
                    <td style={{ fontWeight: r.i === ms ? 800 : 400, paddingLeft: 12 }}>{r.i}{r.i === ms ? " ★" : ""}</td>
                    <td>{r.lot.toFixed(3)}</td>
                    <td>{r.cumLots.toFixed(3)}</td>
                    <td style={{ color: "#4b5563" }}>{r.step.toFixed(0)}</td>
                    <td>${r.margin.toFixed(0)}</td>
                    <td>${r.loss.toFixed(0)}</td>
                    <td style={{ fontWeight: 700 }}>{r.ml.toFixed(0)}%</td>
                    <td style={{ paddingRight: 12 }}>
                      {r.status === "safe" ? <span className="bs">SAFE</span> : r.status === "mcall" ? <span className="bmc">M.CALL</span> : <span className="bd">LIQ</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ margin: "0 12px 10px", padding: "8px 12px", background: "#0d1424", borderRadius: 8, border: "1px solid #111827", fontSize: 10, color: "#4b5563", display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span>Lot x{lotMult} (lv 1-{Number(degFrom)-1})</span>
            <span>{"·"}</span>
            <span>Deg. x{degMult} da lv.{degFrom}</span>
            <span>{"·"}</span>
            <span>Step x{stepMult}/lv</span>
          </div>

          <div style={{ padding: "0 12px" }}>
            <button className="btn" onClick={() => setTab("calc")} style={{ background: "linear-gradient(135deg,#1a2235,#1f2937)", boxShadow: "none", border: "1px solid #1f2937" }}>
              {"←"} Modifica parametri
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
