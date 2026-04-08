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
const LOT_SIZE = 100; // oz per lot XAUUSD

function marginPerLot(price, lev) {
  return (price * LOT_SIZE) / lev;
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

function maxSafe(rows) {
  let m = 0;
  for (const r of rows) { if (r.safe) m = r.i; else break; }
  return m;
}

export default function App() {
  const [equity, setEquity] = useState("2400");
  const [price, setPrice] = useState("3300");
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

  const fetchGold = useCallback(async () => { setGoldSt("loading"); const apis = [ async () => { const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1m&range=1d"); const d = await r.json(); const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice; if (!p || isNaN(p)) throw new Error("no price"); return p; }, async () => { const r = await fetch("https://api.frankfurter.app/latest?from=XAU&to=USD"); const d = await r.json(); if (!d.rates?.USD) throw new Error("no rate"); return d.rates.USD; }, ]; for (const api of apis) { try { const p = await api(); if (p && !isNaN(Number(p)) && Number(p) > 500) { setPrice(Number(p).toFixed(2)); setUpdated(new Date()); setGoldSt("live"); return; } } catch (_) {} } setGoldSt("error"); }, []);back, useEffect, useRef } from "react";

const LEV = [
  { label: "1:50", value: 50 },
  { label: "1:100", value: 100 },
  { label: "1:200", value: 200 },
  { label: "1:500", value: 500 },
  { label: "1:1000", value: 1000 },
  { label: "1:2000", value: 2000 },
];
const CONFIGS = ["OnlyBuy", "OnlySell", "BuyAndSell"];
const LOT_SIZE = 100; // oz per lot XAUUSD

function marginPerLot(price, lev) {
  return (price * LOT_SIZE) / lev;
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

function maxSafe(rows) {
  let m = 0;
  for (const r of rows) { if (r.safe) m = r.i; else break; }
  return m;
}

export default function App() {
  const [equity, setEquity] = useState("2400");
  const [price, setPrice] = useState("3300");
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
        const r = await fetch("https://api.metals.live/v1/spot/gold");
        const d = await r.json();
        return Array.isArray(d) ? d[0].gold : d.gold;
      },
      async () => {
        const r = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
        const d = await r.json();
        return d.items[0].xauPrice;
      },
    ];
    for (const api of apis) {
      try {
        const p = await api();
        if (p && !isNaN(Number(p))) {
          setPrice(Number(p).toFixed(2));
          setUpdated(new Date());
          setGoldSt("live");
          return;
        }
      } catch (_) {}
    }
    setGoldSt("error");
  }, []);

  useEffect(() => {
    fetchGold();
    const iv = setInterval(fetchGold, 60000);
    return () => clearInterval(iv);
  }, [fetchGold]);

  const calculate = useCallback(() => {
    const result = calcLevels(
      Number(equity), Number(price), Number(lev),
      Number(startLot), Number(lotMult),
      Number(degFrom), Number(degMult),
      Number(stepBase), Number(stepMult)
    );
    setRows(result);
    setTab("table");
    setTimeout(() => ref.current && ref.current.scrollIntoView({ behavior: "smooth" }), 80);
  }, [equity, price, lev, startLot, lotMult, degFrom, degMult, stepBase, stepMult]);

  const ms = rows ? maxSafe(rows) : 0;
  const mpl = marginPerLot(Number(price), Number(lev));
  const safeRow = rows && rows[ms - 1];
  const dotColor = goldSt === "live" ? "#22c55e" : goldSt === "loading" ? "#f59e0b" : goldSt === "error" ? "#ef4444" : "#6b7280";
  const bannerColor = ms >= 7 ? "#22c55e" : ms >= 5 ? "#f59e0b" : "#ef4444";

  const inp = {
    background: "#111827", border: "1px solid #374151", borderRadius: 10,
    padding: "12px 14px", color: "#f9fafb", fontSize: 15,
    fontFamily: "inherit", outline: "none", width: "100%",
    WebkitAppearance: "none", MozAppearance: "textfield",
  };
  const selArrow = "url(%22data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E%22)"; }}
            style={{ ...inp, background: "rgba(0,0,0,.3)", border: "1px solid #3d2e00", color: "#fbbf24" }} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 5, margin: "14px 14px 0", background: "#111827", borderRadius: 11, padding: 4 }}>
        <button className={"tb" + (tab === "calc" ? " on" : "")} onClick={() => setTab("calc")}>Ã¢ÂÂ Parametri</button>
        <button className={"tb" + (tab === "table" ? " on" : "")} onClick={() => setTab("table")} disabled={!rows}>
          Ã°ÂÂÂ Risultati{rows ? ` (${ms} safe)` : ""}
        </button>
      </div>

      {/* PARAMS */}
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
          <button className="btn" onClick={calculate}>Ã¢ÂÂ¡ Calcola livelli</button>
        </div>
      )}

      {/* RESULTS */}
      {tab === "table" && rows && (
        <div ref={ref} className="su" style={{ padding: "14px 0 110px" }}>
          <div style={{ margin: "0 14px 14px", background: "#0d1424", border: `2px solid ${bannerColor}`, borderRadius: 16, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 76, fontWeight: 800, color: bannerColor, lineHeight: 1, letterSpacing: "-.03em" }}>{ms}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 5, textTransform: "uppercase", letterSpacing: ".1em" }}>Livelli sicuri massimi</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>XAU ${Number(price).toLocaleString()} ÃÂ· 1:{lev} ÃÂ· ${Number(equity).toLocaleString()} eq.</div>
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
                  <td style={{ fontWeight: r.i === ms ? 800 : 400, paddingLeft: 14 }}>{r.i}{r.i === ms ? "Ã¢ÂÂ" : ""}</td>
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
            <span>Lot x{lotMult} (1-{Number(degFrom)-1})</span><span>ÃÂ·</span>
            <span>Deg. x{degMult} da lv.{degFrom}</span><span>ÃÂ·</span>
            <span>Step x{stepMult}/lv</span>
          </div>
          <div style={{ padding: "0 14px" }}>
            <button className="btn" onClick={() => setTab("calc")} style={{ background: "linear-gradient(135deg,#1f2937,#374151)", boxShadow: "none" }}>
              Ã¢ÂÂ Modifica parametri
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
