import { useState, useCallback, useEffect, useRef } from "react";

const LEVERAGE_OPTIONS = [
  { label: "1:50", value: 50 },
  { label: "1:100", value: 100 },
  { label: "1:200", value: 200 },
  { label: "1:500", value: 500 },
  { label: "1:1000", value: 1000 },
  { label: "1:2000", value: 2000 },
];

const CONFIG_PRESETS = ["OnlyBuy", "OnlySell", "BuyAndSell"];
const CONTRACT_SIZE = 100;

function calcMarginPerLot(price, leverage) {
  return (price * CONTRACT_SIZE) / leverage;
}

function calcLevels({ equity, price, leverage, startLot, lotMultiplier, degressiveFrom, degressiveMult, gridStepBase, gridStepMultiplier }) {
  const marginPerLot = calcMarginPerLot(price, leverage);
  const levels = [];
  let cumLots = 0;
  let currentLot = startLot;
  let currentStep = gridStepBase;
  let cumFloatingLoss = 0;
  let marginCallCount = 0;

  for (let i = 1; i <= 25; i++) {
    cumLots = parseFloat((cumLots + currentLot).toFixed(4));
    const marginRequired = cumLots * marginPerLot;
    if (i > 1) {
      const prevCumLots = cumLots - currentLot;
      cumFloatingLoss = parseFloat((cumFloatingLoss + currentStep * prevCumLots).toFixed(2));
    }
    const freeMargin = equity - cumFloatingLoss;
    const marginLevel = marginRequired > 0 ? (freeMargin / marginRequired) * 100 : 0;
    const status = marginLevel >= 100 ? "SAFE" : "MARGIN CALL";
    if (status === "MARGIN CALL") marginCallCount++;
    levels.push({
      level: i, lotSize: parseFloat(currentLot.toFixed(4)), totalLots: cumLots,
      marginRequired: parseFloat(marginRequired.toFixed(2)),
      floatingLoss: parseFloat(cumFloatingLoss.toFixed(2)),
      freeMargin: parseFloat(freeMargin.toFixed(2)),
      marginLevel: parseFloat(marginLevel.toFixed(1)),
      step: parseFloat(currentStep.toFixed(2)), status,
    });
    if (marginCallCount >= 2) break;
    const nextMult = (i + 1) >= degressiveFrom ? degressiveMult : lotMultiplier;
    currentLot = parseFloat((currentLot * nextMult).toFixed(4));
    currentStep = parseFloat((currentStep * gridStepMultiplier).toFixed(2));
  }
  return levels;
}

function findMaxSafe(levels) {
  let max = 0;
  for (const l of levels) { if (l.status === "SAFE") max = l.level; else break; }
  return max;
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

const inpStyle = {
  background: "#111827", border: "1px solid #374151", borderRadius: 10,
  padding: "13px 14px", color: "#f9fafb", fontSize: 15,
  fontFamily: "inherit", outline: "none", width: "100%",
  WebkitAppearance: "none", MozAppearance: "textfield",
};

function Inp({ value, onChange, step }) {
  return (
    <input type="number" value={value} step={step}
      onChange={e => onChange(e.target.value)}
      inputMode="decimal" style={inpStyle} />
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      ...inpStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none",
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
    }}>
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

export default function App() {
  const [equity, setEquity] = useState("2400");
  const [price, setPrice] = useState("3300");
  const [leverage, setLeverage] = useState(500);
  const [startLot, setStartLot] = useState("0.01");
  const [lotMult, setLotMult] = useState("2");
  const [degFrom, setDegFrom] = useState("5");
  const [degMult, setDegMult] = useState("1.75");
  const [stepBase, setStepBase] = useState("130");
  const [stepMult, setStepMult] = useState("1.05");
  const [config, setConfig] = useState("OnlyBuy");
  const [levels, setLevels] = useState(null);
  const [goldStatus, setGoldStatus] = useState("idle");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("calc");
  const resultRef = useRef(null);

  const fetchGold = useCallback(async () => {
    setGoldStatus("loading");
    try {
      const r = await fetch("https://api.metals.live/v1/spot/gold");
      const d = await r.json();
      const p = Array.isArray(d) ? (d[0] && d[0].gold) : d.gold;
      if (p && !isNaN(p)) { setPrice(parseFloat(p).toFixed(2)); setLastUpdated(new Date()); setGoldStatus("live"); return; }
    } catch (e) { }
    try {
      const r2 = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
      const d2 = await r2.json();
      const p2 = d2.items && d2.items[0] && d2.items[0].xauPrice;
      if (p2 && !isNaN(p2)) { setPrice(parseFloat(p2).toFixed(2)); setLastUpdated(new Date()); setGoldStatus("live"); return; }
    } catch (e) { }
    setGoldStatus("error");
  }, []);

  useEffect(() => {
    fetchGold();
    const iv = setInterval(fetchGold, 60000);
    return () => clearInterval(iv);
  }, [fetchGold]);

  const calculate = useCallback(() => {
    const res = calcLevels({
      equity: +equity, price: +price, leverage: +leverage,
      startLot: +startLot, lotMultiplier: +lotMult,
      degressiveFrom: +degFrom, degressiveMult: +degMult,
      gridStepBase: +stepBase, gridStepMultiplier: +stepMult,
    });
    setLevels(res);
    setActiveTab("table");
    setTimeout(() => { if (resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth" }); }, 100);
  }, [equity, price, leverage, startLot, lotMult, degFrom, degMult, stepBase, stepMult]);

  const maxSafe = levels ? findMaxSafe(levels) : 0;
  const mpl = calcMarginPerLot(+price, +leverage);
  const safeLevel = levels && levels[maxSafe - 1];

  const statusColors = { live: "#22c55e", loading: "#f59e0b", error: "#ef4444", idle: "#6b7280" };
  const statusDot = statusColors[goldStatus] || "#6f7280";
  const bannerColor = maxSafe >= 7 ? "#22c55e" : maxSafe >= 5 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100svh", background: "#0a0f1a", color: "#f9fafb", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { display: none; }
        .tab { flex: 1; padding: 11px; background: none; border: none; color: #6b7280; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; border-radius: 10px; transition: all .2s; -webkit-tap-highlight-color: transparent; }
        .tab.active { background: #1d2939; color: #f9fafb; }
        .tab:disabled { opacity: .4; cursor: default; }
        .btn { width: 100%; padding: 17px; border: none; border-radius: 14px; background: linear-gradient(135deg,#2563eb,#3b82f6); color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: .03em; box-shadow: 0 4px 24px rgba(59,130,246,.35); transition: transform .15s, opacity .15s; -webkit-tap-highlight-color: transparent; }
        .btn:active { transform: scale(.97); opacity: .9; }
        .row-s td { color: #22c55e; }
        .row-d td { color: #ef4444; }
        .row-max { background: rgba(59,130,246,.1) !important; }
        td, th { padding: 11px 10px; white-space: nowrap; }
        th { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
        tbody tr { border-top: 1px solid #1f2937; }
        .bs { background: #052e16; color: #22c55e; border: 1px solid #166534; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
        .bd { background: #2d0a0a; color: #ef4444; border: 1px solid #7f1d1d; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
        .su { animation: su .35s ease-out; }
        @keyframes su { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .pulse { animation: pu 2s infinite; }
        @keyframes pu { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#0d1424", borderBottom: "1px solid #1f2937", padding: "16px 20px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>â© Martingale Calc</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>XAUUSD Â· Degressive</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusDot }} className={goldStatus === "loading" ? "pulse" : ""} />
              <span style={{ fontSize: 11, color: statusDot, fontWeight: 600 }}>
                {goldStatus === "live" ? "LIVE" : goldStatus === "loading" ? "fetching..." : goldStatus === "error" ? "offline" : "-"}
              </span>
            </div>
            {lastUpdated && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{lastUpdated.toLocaleTimeString()}</div>}
          </div>
        </div>
      </div>

      {/* GOLD CARD */}
      <div style={{ margin: "16px 16px 0", background: "linear-gradient(135deg,#1a1400,#221c00)", border: "1px solid #3d2e00", borderRadius: 16, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, marginBottom: 4 }}>XAU / USD</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#fbbf24", letterSpacing: "-.02em" }}>
              ${parseFloat(price || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>
              Margin/lot @ 1:{leverage} â <span style={{ color: "#d97706", fontWeight: 600 }}>${mpl.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={fetchGold} style={{ background: "rgba(251,191,36,.1)", border: "1px solid #78350f", borderRadius: 10, padding: "8px 12px", color: "#fbbf24", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>â»</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>Override manuale</div>
          <input type="number" value={price} inputMode="decimal"
            onChange={e => { setPrice(e.target.value); setGoldStatus("error"); }}
            style={{ background: "rgba(0,0,0,.3)", border: "1px solid #3d2e00", borderRadius: 10, padding: "10px 14px", color: "#fbbf24", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%" }} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 6, margin: "16px 16px 0", background: "#111827", borderRadius: 12, padding: 4 }}>
        <button className={`tab${activeTab === "calc" ? " active" : ""}`} onClick={() => setActiveTab("calc")}>â Parametri</button>
        <button className={`tab${activeTab === "table" ? " active" : ""}`} onClick={() => setActiveTab("table")} disabled={!levels}>
          ð Risultati{levels ? ` (${maxSafe} safe)` : ""}
        </button>
      </div>

      {/* PARAMS */}
      {activeTab === "calc" && (
        <div style={{ padding: "16px 16px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Equity ($)"><Inp value={equity} onChange={setEquity} /></Field>
            <Field label="Leverage"><Sel value={leverage} onChange={setLeverage} options={LEVERAGE_OPTIONS} /></Field>
          </div>
          <Field label="Configuration"><Sel value={config} onChange={setConfig} options={CONFIG_PRESETS} /></Field>
          <div style={{ height: 1, background: "#1f2937" }} />
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>Lot sizing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Start Lot"><Inp value={startLot} onChange={setStartLot} step="0.01" /></Field>
            <Field label={`Lot Mult (1-${+degFrom - 1})`}><Inp value={lotMult} onChange={setLotMult} step="0.1" /></Field>
          </div>
          <div style={{ height: 1, background: "#1f2937" }} />
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>Degressive Martingale</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Da livello"><Inp value={degFrom} onChange={setDegFrom} /></Field>
            <Field label="Moltiplicatore"><Inp value={degMult} onChange={setDegMult} step="0.05" /></Field>
          </div>
          <div style={{ height: 1, background: "#1f2937" }} />
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>Grid Step</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Step base (pts)"><Inp value={stepBase} onChange={setStepBase} /></Field>
            <Field label="Step mult x"><Inp value={stepMult} onChange={setStepMult} step="0.01" /></Field>
          </div>
          <button className="btn" onClick={calculate}>â© Calcola livelli</button>
        </div>
      )}

      {/* RESULTS */}
      {activeTab === "table" && levels && (
        <div style={{ padding: "16px 0 120px" }} ref={resultRef} className="su">
          {/* Banner */}
          <div style={{ margin: "0 16px 16px", background: "#0d1424", border: `2px solid ${bannerColor}`, borderRadius: 18, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 80, fontWeight: 800, color: bannerColor, lineHeight: 1, letterSpacing: "-.03em" }}>{maxSafe}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6, textTransform: "uppercase", letterSpacing: ".1em" }}>Livelli sicuri massimi</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>XAU ${parseFloat(price).toLocaleString()} Â· 1:{leverage} Â· ${parseFloat(equity).toLocaleString()} eq.</div>
          </div>
          {/* Stats */}
          {safeLevel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px 16px" }}>
              {[
                { l: "Margin/lot", v: `$${mpl.toFixed(2)}` },
                { l: "Margin Level", v: `${safeLevel.marginLevel.toFixed(1)}%` },
                { l: "Float Loss", v: `$${safeLevel.floatingLoss.toFixed(2)}` },
                { l: "Free Margin", v: `$${safeLevel.freeMargin.toFixed(2)}` },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{l} @ max</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {/* Table */}
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
              <thead><tr style={{ background: "#0d1424" }}>
                <th style={{ textAlign: "left", paddingLeft: 16 }}>#</th>
                <th>Lot</th><th>Tot</th><th>Step</th><th>Margin</th><th>Loss</th><th>Lvl%</th>
                <th style={{ paddingRight: 16 }}>St.</th>
              </tr></thead>
              <tbody>
                {levels.map(r => {
                  const isSafe = r.status === "SAFE";
                  const isMax = r.level === maxSafe;
                  return (
                    <tr key={r.level} className={`${isSafe ? "row-s" : "row-d"}${isMax ? " row-max" : ""}`}>
                      <td style={{ fontWeight: isMax ? 800 : 400, paddingLeft: 16 }}>{r.level}{isMax ? "â" : ""}</td>
                      <td>{r.lotSize.toFixed(3)}</td>
                      <td>{r.totalLots.toFixed(3)}</td>
                      <td style={{ color: "#6b7280" }}>{r.step.toFixed(0)}</td>
                      <td>${r.marginRequired.toFixed(0)}</td>
                      <td>${r.floatingLoss.toFixed(0)}</td>
                      <td style={{ fontWeight: 700 }}>{r.marginLevel.toFixed(0)}%</td>
                      <td style={{ paddingRight: 16 }}>
                        {isSafe ? <span className="bs">SAFE</span> : <span className="bd">CALL</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ margin: "0 16px 14px", padding: "10px 14px", background: "#111827", borderRadius: 10, border: "1px solid #1f2937", fontSize: 10, color: "#6b7280", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span>Lot x{lotMult} (1-{+degFrom - 1})</span>
            <span>Â·</span>
            <span>Deg. x{degMult} da lv.{degFrom}</span>
            <span>Â·</span>
            <span>Step x{stepMult}/lv</span>
          </div>
          <div style={{ padding: "0 16px" }}>
            <button className="btn" onClick={() => setActiveTab("calc")} style={{ background: "linear-gradient(135deg,#1f2937,#374151)", boxShadow: "none" }}>
              â Modifica parametri
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
