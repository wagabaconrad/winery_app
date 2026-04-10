"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, FlaskConical, TrendingUp, ArrowRightLeft, Scale, Calculator } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import {
  calculateSellingPrice, calculateProfitPerUnit, calculateCostPerUnit,
  calculateMarginPercent, kgToGrams, litersToBottles, bottlesToLiters, scaleRecipe,
} from "@/lib/calculations";

type Tab = "pricing" | "production" | "simulator" | "converter";

function ResultRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-primary)" }}>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function CalcInput({ label, value, onChange, placeholder = "0" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
    </div>
  );
}

function PricingCalculator() {
  const [cost, setCost] = useState(""); const [margin, setMargin] = useState("");
  const c = parseFloat(cost) || 0; const m = parseFloat(margin) || 0;
  const sp = calculateSellingPrice(c, m);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><DollarSign size={18} style={{ color: "var(--accent-secondary)" }} /> Pricing Calculator</h3>
        <div className="space-y-4"><CalcInput label="Cost per Unit" value={cost} onChange={setCost} /><CalcInput label="Desired Profit Margin (%)" value={margin} onChange={setMargin} /></div>
      </div>
      <div className="rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Results</h3>
        <ResultRow label="Selling Price" value={sp.toLocaleString()} color="var(--accent-secondary)" />
        <ResultRow label="Profit per Unit" value={calculateProfitPerUnit(sp, c).toLocaleString()} color="var(--success)" />
        <ResultRow label="Actual Margin" value={`${calculateMarginPercent(sp, c)}%`} color="var(--info)" />
      </div>
    </motion.div>
  );
}

function ProductionCalculator() {
  const [tc, setTc] = useState(""); const [oq, setOq] = useState("");
  const cpu = calculateCostPerUnit(parseFloat(tc) || 0, parseFloat(oq) || 0);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><FlaskConical size={18} style={{ color: "var(--accent-secondary)" }} /> Production Calculator</h3>
        <div className="space-y-4"><CalcInput label="Total Production Cost" value={tc} onChange={setTc} /><CalcInput label="Output Quantity" value={oq} onChange={setOq} /></div>
      </div>
      <div className="rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Results</h3>
        <ResultRow label="Cost per Unit" value={cpu.toLocaleString()} color="var(--accent-secondary)" />
        <ResultRow label="Suggested Price (30%)" value={calculateSellingPrice(cpu, 30).toLocaleString()} color="var(--success)" />
        <ResultRow label="Suggested Price (50%)" value={calculateSellingPrice(cpu, 50).toLocaleString()} color="var(--warning)" />
      </div>
    </motion.div>
  );
}

function ProfitSimulator() {
  const [p, setP] = useState(""); const [c, setC] = useState(""); const [q, setQ] = useState("");
  const [dp, setDp] = useState("0"); const [dc, setDc] = useState("0"); const [dq, setDq] = useState("0");
  const pn = parseFloat(p)||0; const cn = parseFloat(c)||0; const qn = parseFloat(q)||0;
  const cur = (pn-cn)*qn;
  const np = pn*(1+(parseFloat(dp)||0)/100); const nc = cn*(1+(parseFloat(dc)||0)/100); const nq = qn*(1+(parseFloat(dq)||0)/100);
  const proj = (np-nc)*nq; const diff = proj-cur;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><TrendingUp size={18} style={{ color: "var(--accent-secondary)" }} /> Current Values</h3>
          <div className="space-y-3"><CalcInput label="Selling Price" value={p} onChange={setP} /><CalcInput label="Cost per Unit" value={c} onChange={setC} /><CalcInput label="Quantity Sold" value={q} onChange={setQ} /></div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>What If...?</h3>
          <div className="space-y-3"><CalcInput label="Price changes by (%)" value={dp} onChange={setDp} /><CalcInput label="Cost changes by (%)" value={dc} onChange={setDc} /><CalcInput label="Production changes by (%)" value={dq} onChange={setDq} /></div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Current Profit</p><p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{cur.toLocaleString()}</p></div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Projected</p><p className="text-xl font-bold" style={{ color: proj>=0?"var(--success)":"var(--danger)" }}>{proj.toLocaleString()}</p></div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Difference</p><p className="text-xl font-bold" style={{ color: diff>=0?"var(--success)":"var(--danger)" }}>{diff>=0?"+":""}{diff.toLocaleString()}</p></div>
      </div>
    </motion.div>
  );
}

function UnitConverter() {
  const [kg, setKg] = useState(""); const [lt, setLt] = useState(""); const [bs, setBs] = useState("750");
  const [oq, setOq] = useState(""); const [oy, setOy] = useState(""); const [dy, setDy] = useState("");
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Scale size={18} /> Weight</h3>
        <div className="space-y-3"><CalcInput label="Kilograms" value={kg} onChange={setKg} /><ResultRow label="Grams" value={kgToGrams(parseFloat(kg)||0).toLocaleString()} color="var(--info)" /></div>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><ArrowRightLeft size={18} /> Volume</h3>
        <div className="space-y-3">
          <CalcInput label="Liters" value={lt} onChange={setLt} />
          <div className="space-y-1.5"><label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Bottle Size (ml)</label>
            <select value={bs} onChange={(e)=>setBs(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background:"var(--bg-primary)",border:"1px solid var(--border-color)",color:"var(--text-primary)" }}>
              <option value="250">250ml</option><option value="330">330ml</option><option value="500">500ml</option><option value="750">750ml (wine)</option><option value="1000">1L</option><option value="1500">1.5L (magnum)</option>
            </select></div>
          <ResultRow label="Bottles" value={String(litersToBottles(parseFloat(lt)||0,parseInt(bs)))} color="var(--success)" />
          <ResultRow label="Liters used" value={bottlesToLiters(litersToBottles(parseFloat(lt)||0,parseInt(bs)),parseInt(bs)).toLocaleString()} color="var(--text-secondary)" />
        </div>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Calculator size={18} /> Recipe Scaler</h3>
        <div className="space-y-3"><CalcInput label="Ingredient Qty" value={oq} onChange={setOq} placeholder="e.g. 5 kg" /><CalcInput label="Original Yield" value={oy} onChange={setOy} placeholder="e.g. 10" /><CalcInput label="Desired Yield" value={dy} onChange={setDy} placeholder="e.g. 50" />
          <ResultRow label="Scaled Qty" value={scaleRecipe(parseFloat(oq)||0,parseFloat(oy)||0,parseFloat(dy)||0).toLocaleString()} color="var(--accent-secondary)" /></div>
      </div>
    </motion.div>
  );
}

export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>("pricing");
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pricing", label: "Pricing", icon: <DollarSign size={16} /> },
    { id: "production", label: "Production", icon: <FlaskConical size={16} /> },
    { id: "simulator", label: "Simulator", icon: <TrendingUp size={16} /> },
    { id: "converter", label: "Converter", icon: <ArrowRightLeft size={16} /> },
  ];
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Smart Calculator" description="Pricing, production, profit simulation, and unit conversions" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (<button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all" style={{ background: tab===t.id?"var(--accent-gradient)":"var(--bg-card)", color: tab===t.id?"#fff":"var(--text-secondary)", border: tab===t.id?"none":"1px solid var(--border-color)" }}>{t.icon} {t.label}</button>))}
      </div>
      {tab==="pricing"&&<PricingCalculator/>}{tab==="production"&&<ProductionCalculator/>}{tab==="simulator"&&<ProfitSimulator/>}{tab==="converter"&&<UnitConverter/>}
    </div>
  );
}
