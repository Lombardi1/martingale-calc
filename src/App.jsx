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
function marginPerLot(price, lev) { return (price * LOT_SIZE) / lev; }
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
    const safe = ml >= 100;
    if (!safe) calls++;
    rows.push({ i, lot: parseFloat(lot.toFixed(4)), cumLots, margin: parseFloat(margin.toFixed(2)), loss, free: parseFloat(free.toFixed(2)), ml: parseFloat(ml.toFixed(1)), step: parseFloat(step.toFixed(1)), safe });
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
        const r = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT");
        const d = await r.json();
        const p = d?.result?.list?.[0]?.lastPrice;
        if (!p) throw new Error("no price");
        return Number(p);
      },
      async () => {
        const r = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json");
        const d = await r.json();
        const p = d?.xau?.usd;
        if (!p || p < 500) throw new Error("bad rate");
        return p;
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
  const inp = { background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "12px 14px", color: "#f9fafb", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", WebkitAppearance: "none", MozAppearance: "textfield" };
  const selArrow = "url(%22data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E%22)";
  return (
    <div style={{ minHeight: "100svh", background: "#0a0f1a", color: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        ::-webkit-scrollbar{display:none}
        .tb{flex:1;padding:11px;background:none;border:none;color:#6b7280;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;border-radius:10px;transition:all .2s;-webkit-tap-highlight-color:transparent}
        .tb.on{background:#1d2939;color:#f9fafb}
        .tb:disabled{opacity:.4;cursor:default}
        .btn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.03em;box-shadow:0 4px 24px rgba(59,130,246,.35);transition:transform .15s,opacity .15s;-webkit-tap-highlight-color:transparent}
        .btn:active{transform:scale(.97);opacity:.9}
        .rs td{color:#22c55e}.rd td{color:#ef4444}
        .rmx{background:rgba(59,130,246,.1)!important}
        td,th{padding:10px 9px;white-space:nowrap}
        th{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
        tbody tr{border-top:1px solid #1f2937}
        .bs{background:#052e16;color:#22c55e;border:1px solid #166534;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700}
        .bd{background:#2d0a0a;color:#ef4444;border:1px solid #7f1d1d;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700}
        .su{animation:su .35s ease-out}
        @keyframes su{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .pu{animation:pu 2s infinite}
        @keyframes pu{0%,100%{opacity:1}50%{opacity:.4}}
        .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:5px}
        .div{height:1px;background:#1f2937}
        .sec{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
      `}</style>
      <div style={{ background: "#0d1424", borderBottom: "1px solid #1f2937", padding: "15px 18px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>â¡ Martingale Calc</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>XAUUSD Â· Degressive</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor }} className={goldSt === "loading" ? "pu" : ""} />
              <span style={{ fontSize: 11, color: dotColor, fontWeight: 600 }}>
                {goldSt === "live" ? "LIVE" : goldSt === "loading" ? "fetching..." : goldSt === "error" ? "offline" : "-"}
              </span>
            </div>
            {updated && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{updated.toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>
      <div style={{ margin: "14px 14px 0", background: "linear-gradient(135deg,#1a1400,#221c00)", border: "1px solid #3d2e00", borderRadius: 14, padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: 3 }}>XAU / USD</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#fbbf24", letterSpacing: "-.02em" }}>
              ${Number(price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: "#78716c", marginTop: 3 }}>
              Margin/lot @ 1:{lev} <span style={{ color: "#d97706", fontWeight: 600 }}>${mpl.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={fetchGold} style={{ background: "rgba(251,191,36,.1)", border: "1px solid #78350f", borderRadius: 9, padding: "7px 11px", color: "#fbbf24", fontSize: 18, cursor: "pointer", lineHeight: 1, WebkitTapHighlightColor: "transparent" }}>â»</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="lbl">Override manuale</div>
          <input type="number" value={price} inputMode="decimal" onChange={e => { setPrice(e.target.value); setGoldSt("error"); }} style={{ ...inp, background: "rgba(0,0,0,.3)", border: "1px solid #3d2e00", color: "#fbbf24" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, margin: "14px 14px 0", background: "#111827", borderRadius: 11, padding: 4 }}>
        <button className={"tb" + (tab === "calc" ? " on" : "")} onClick={() => setTab("calc")}>â Parametri</button>
        <button className={"tb" + (tab === "table" ? " on" : "")} onClick={() => setTab("table")} disabled={!rows}>
          ð Risultati{rows ? ` (${ms} safe)` : ""}
        </button>
      </div>
      {tab === "calc" && (
        <div style={{ padding: "14px 14px 110px", display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <div><div className="lbl">Equity ($)</div><input type="number" value={equity} inputMode="decimal" onChange={e => setEquity(e.target.value)} style={inp} /></div>
            <div><div className="lbl">Leverage</div>
              <select value={lev} onChange={e => setLev(Number(e.target.value))} style={{ ...inp, cursor: "pointer", appearance: "none", backgroundImage: selArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                {LEV.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div><div className="lbl">Configuration</div>
            <select value={config} onChange={e => setConfig(e.target.value)} style={{ ...inp, cursor: "pointer", appearance: "none", backgroundImage: selArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
              {CONFIGS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="div" />
          <div className="sec">Lot sizing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <div><div className="lbl">Start Lot</div><input type="number" value={startLot} inputMode="decimal" step="0.01" onChange={e => setStartLot(e.target.value)} style={inp} /></div>
            <div><div className="lbl">Lot Mult (1-{Number(degFrom)-1})</div><input type="number" value={lotMult} inputMode="decimal" step="0.1" onChange={e => setLotMult(e.target.value)} style={inp} /></div>
          </div>
          <div className="div" />
          <div className="sec">Degressive Martingale</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <div><div className="lbl">Da livello</div><input type="number" value={degFrom} inputMode="decimal" onChange={e => setDegFrom(e.target.value)} style={inp} /></div>
            <div><div className="lbl">Moltiplicatore</div><input type="number" value={degMult} inputMode="decimal" step="0.05" onChange={e => setDegMult(e.target.value)} style={inp} /></div>
          </div>
          <div className="div" />
          <div className="sec">Grid Step</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <div><div className="lbl">Step base (pts)</div><input type="number" value={stepBase} inputMode="decimal" onChange={e => setStepBase(e.target.value)} style={inp} /></div>
            <div><div className="lbl">Step mult x</div><input type="number" value={stepMult} inputMode="decimal" step="0.01" onChange={e => setStepMult(e.target.value)} style={inp} /></div>
          </div>
          <button className="btn" onClick={calculate}>â¡ Calcola livelli</button>
        </div>
      )}
      {tab === "table" && rows && (
        <div ref={ref} className="su" style={{ padding: "14px 0 110px" }}>
          <div style={{ margin: "0 14px 14px", background: "#0d1424", border: `2px solid ${bannerColor}`, borderRadius: 16, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 76, fontWeight: 800, color: bannerColor, lineHeight: 1, letterSpacing: "-.03em" }}>{ms}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 5, textTransform: "uppercase", letterSpacing: ".1em" }}>Livelli sicuri massimi</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>XAU ${Number(price).toLocaleString()} Â· 1:{lev} Â· ${Number(equity).toLocaleString()} eq.</div>
          </div>
          {safeRow && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, margin: "0 14px 14px" }}>
              {[
                { l: "Margin/lot", v: `$${mpl.toFixed(2)}` },
                { l: "Margin Level", v: `${safeRow.ml.toFixed(1)}%` },
                { l: "Float Loss", v: `$${safeRow.loss.toFixed(2)}` },
                { l: "Free Margin", v: `$${safeRow.free.toFixed(2)}` },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 11, padding: "11px 13px" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{l} @ max</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ overflowX: "auto", marginBottom: 11 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
              <thead><tr style={{ background: "#0d1424" }}>
                <th style={{ textAlign: "left", paddingLeft: 14 }}>#</th>
                <th>Lot</th><th>Tot</th><th>Step</th><th>Margin</th><th>Loss</th><th>Lvl%</th>
                <th style={{ paddingRight: 14 }}>St.</th>
              </tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.i} className={(r.safe ? "rs" : "rd") + (r.i === ms ? " rmx" : "")}>
                  <td style={{ fontWeight: r.i === ms ? 800 : 400, paddingLeft: 14 }}>{r.i}{r.i === ms ? "â" : ""}</td>
                  <td>{r.lot.toFixed(3)}</td>
                  <td>{r.cumLots.toFixed(3)}</td>
                  <td style={{ color: "#6b7280" }}>{r.step.toFixed(0)}</td>
                  <td>${r.margin.toFixed(0)}</td>
                  <td>${r.loss.toFixed(0)}</td>
                  <td style={{ fontWeight: 700 }}>{r.ml.toFixed(0)}%</td>
                  <td style={{ paddingRight: 14 }}>{r.safe ? <span className="bs">SAFE</span> : <span className="bd">CALL</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ margin: "0 14px 12px", padding: "9px 13px", background: "#111827", borderRadius: 9, border: "1px solid #1f2937", fontSize: 10, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: 7 }}>
            <span>Lot x{lotMult} (1-{Number(degFrom)-1})</span><span>Â·</span>
            <span>Deg. x{degMult} da lv.{degFrom}</span><span>Â·</span>
            <span>Step x{stepMult}/lv</span>
          </div>
          <div style={{ padding: "0 14px" }}>
            <button className="btn" onClick={() => setTab("calc")} style={{ background: "linear-gradient(135deg,#1f2937,#374151)", boxShadow: "none" }}>
              â Modifica parametri
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
