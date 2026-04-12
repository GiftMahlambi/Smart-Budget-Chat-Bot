import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    voiceflow?: { chat: { load: (config: Record<string, unknown>) => void } };
  }
}

/* ─────────────── Stars ─────────────── */
function Stars() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (let i = 0; i < 130; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const sz = Math.random() * 2.4 + 0.4;
      s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;opacity:${Math.random()*.7+.1};animation-duration:${Math.random()*4+2}s;animation-delay:${Math.random()*5}s`;
      el.appendChild(s);
    }
    return () => { el.innerHTML = ""; };
  }, []);
  return <div ref={ref} className="fixed inset-0 pointer-events-none z-0" aria-hidden />;
}

/* ─────────────── Budget types ─────────────── */
interface BudgetData { limit: number; spent: number; label: string; currency: string }

/* ─────────────── Chat message parser ─────────────── */
type BudgetUpdate =
  | { action: "setLimit"; amount: number }
  | { action: "addSpent"; amount: number }
  | { action: "setSpent"; amount: number };

function parseChatText(raw: string): BudgetUpdate | null {
  const text = raw.toLowerCase();
  // Match a number possibly preceded by a currency symbol
  const numRe = /(?:[r$£€]\s*)?(\d[\d\s,]*(?:\.\d{1,2})?)/;
  const m = text.match(numRe);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(/[\s,]/g, ""));
  if (isNaN(amount) || amount <= 0 || amount > 100_000_000) return null;

  if (/\b(?:budget|limit|monthly|total budget|budget of|budget is|set budget|new budget)\b/.test(text))
    return { action: "setLimit", amount };

  if (/\b(?:total spent|spent so far|already spent|have spent)\b/.test(text))
    return { action: "setSpent", amount };

  if (/\b(?:spent|spend|paid|cost|bought|purchase|expense|bill|fee)\b/.test(text))
    return { action: "addSpent", amount };

  return null;
}

/* ─────────────── Voiceflow Widget ─────────────── */
function VoiceflowWidget({ onMessage }: { onMessage: (text: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  // Load the widget script
  useEffect(() => {
    if (loadedRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    function initWidget() {
      if (loadedRef.current) return;
      loadedRef.current = true;
      window.voiceflow?.chat.load({
        verify: { projectID: "69dbef45529f718cef5279b8" },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        voice: { url: "https://runtime-api.voiceflow.com" },
        render: { mode: "embedded", target: container },
      });
    }

    if (window.voiceflow?.chat) { initWidget(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://cdn.voiceflow.com/widget-next/bundle.mjs"]');
    if (existing) { existing.addEventListener("load", initWidget, { once: true }); return; }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
    script.addEventListener("load", initWidget, { once: true });
    document.head.appendChild(script);
  }, []);

  // MutationObserver: watch the widget DOM for new messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let debounce: ReturnType<typeof setTimeout>;

    function scanNewText(root: Node) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const text = n.textContent?.trim() ?? "";
        if (text.length < 6 || seenRef.current.has(text)) continue;
        seenRef.current.add(text);
        onMessageRef.current(text);
      }
    }

    const observer = new MutationObserver((mutations) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE)
              scanNewText(node);
          });
        }
      }, 350);
    });

    // Start observing once the widget has rendered something
    function startObserving() {
      if (container.children.length > 0) {
        observer.observe(container, { childList: true, subtree: true });
      } else {
        setTimeout(startObserving, 400);
      }
    }
    startObserving();

    return () => { observer.disconnect(); clearTimeout(debounce); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: "100%", minHeight: "480px" }}
    />
  );
}

/* ─────────────── Set Budget Modal ─────────────── */
function SetBudgetModal({ current, onSave, onClose }: {
  current: BudgetData | null;
  onSave: (d: BudgetData) => void;
  onClose: () => void;
}) {
  const [limit, setLimit] = useState(current?.limit?.toString() ?? "");
  const [spent, setSpent] = useState(current?.spent?.toString() ?? "");
  const [label, setLabel] = useState(current?.label ?? "Monthly budget goal");
  const [currency, setCurrency] = useState(current?.currency ?? "R");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const l = parseFloat(limit), s = parseFloat(spent);
    if (isNaN(l) || l <= 0) return;
    onSave({ limit: l, spent: isNaN(s) ? 0 : s, label, currency });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,3,26,.88)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-in-up"
        style={{ background: "linear-gradient(160deg,rgba(13,7,53,.99),rgba(8,4,43,.99))", border: "0.5px solid rgba(139,92,246,.45)", boxShadow: "0 0 60px rgba(99,79,167,.35)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-purple-100 font-semibold">Set Your Budget</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors" style={{ background: "rgba(99,79,167,.2)" }}>✕</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Budget label">
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Monthly budget goal" className="input-field" />
          </Field>
          <div className="flex gap-3">
            <Field label="Currency" className="w-20">
              <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} className="input-field text-center" />
            </Field>
            <Field label="Budget limit" className="flex-1">
              <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="3000" min="1" required className="input-field" />
            </Field>
          </div>
          <Field label="Amount spent so far">
            <input type="number" value={spent} onChange={e => setSpent(e.target.value)} placeholder="0" min="0" className="input-field" />
          </Field>
          <button type="submit" className="mt-1 w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            Save Budget
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs text-purple-400 font-medium">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────── Budget Barometer ─────────────── */
function BudgetBarometer({ budget, onEdit, flash }: { budget: BudgetData; onEdit: () => void; flash: boolean }) {
  const pct = Math.min((budget.spent / budget.limit) * 100, 100);
  const remaining = Math.max(budget.limit - budget.spent, 0);
  const isOver = budget.spent > budget.limit;
  const barColor = pct >= 90 ? "linear-gradient(90deg,#7c3aed,#ef4444)" : pct >= 70 ? "linear-gradient(90deg,#7c3aed,#f59e0b)" : "linear-gradient(90deg,#7c3aed,#4f46e5)";
  const alertColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#4ade80";
  const alertMsg = isOver
    ? `You've exceeded your budget by ${budget.currency}${(budget.spent - budget.limit).toLocaleString()}.`
    : pct >= 90 ? `You're at ${Math.round(pct)}% of your budget. Almost at the limit!`
    : pct >= 70 ? `You've used ${Math.round(pct)}% — keep an eye on spending.`
    : `You're on track — ${Math.round(pct)}% of your budget used.`;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: flash ? "rgba(124,58,237,.18)" : "linear-gradient(160deg,rgba(13,7,53,.92),rgba(8,4,43,.95))",
        border: flash ? "0.5px solid rgba(139,92,246,.7)" : "0.5px solid rgba(139,92,246,.25)",
        boxShadow: flash ? "0 0 24px rgba(124,58,237,.4)" : "0 0 40px rgba(99,79,167,.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(99,79,167,.25)" }}>🎯</div>
          <div>
            <p className="text-purple-100 font-semibold text-sm leading-tight">{budget.label}</p>
            <p className="text-purple-400 text-xs mt-0.5">{budget.currency}{budget.spent.toLocaleString()} of {budget.currency}{budget.limit.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {flash && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(124,58,237,.25)", color: "#c4b5fd" }}>auto-updated</span>}
          <div className="text-right mr-1">
            <p className="text-sm font-bold" style={{ color: isOver ? "#ef4444" : "#e2d9f3" }}>{budget.currency}{remaining.toLocaleString()}</p>
            <p className="text-xs text-purple-500">{isOver ? "over" : "left"}</p>
          </div>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors" style={{ background: "rgba(99,79,167,.18)", border: "0.5px solid rgba(139,92,246,.22)" }} title="Edit">✏️</button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-purple-600">{budget.currency}0</span>
          <span className="font-semibold" style={{ color: alertColor }}>{Math.round(pct)}%</span>
          <span className="text-purple-600">{budget.currency}{budget.limit.toLocaleString()}</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(99,79,167,.2)" }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: barColor, boxShadow: pct >= 90 ? "0 0 10px rgba(239,68,68,.5)" : "0 0 8px rgba(124,58,237,.35)" }} />
          {[25, 50, 75].map(mk => <div key={mk} className="absolute top-0 bottom-0 w-px" style={{ left: `${mk}%`, background: "rgba(255,255,255,.12)" }} />)}
        </div>
        <div className="flex justify-between text-xs text-purple-700"><span>25%</span><span>50%</span><span>75%</span></div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={{ background: `${alertColor}16`, border: `0.5px solid ${alertColor}35`, color: alertColor }}>
        <span>{isOver ? "🚨" : pct >= 90 ? "⚠️" : pct >= 70 ? "💛" : "✅"}</span>
        <span>{alertMsg}</span>
      </div>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */
export default function Home() {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [flash, setFlash] = useState(false);
  const budgetRef = useRef<BudgetData | null>(null);
  useEffect(() => { budgetRef.current = budget; }, [budget]);

  const handleChatMessage = useCallback((text: string) => {
    const update = parseChatText(text);
    if (!update) return;

    setBudget((prev) => {
      const base = prev ?? { limit: 0, spent: 0, label: "Monthly budget goal", currency: "R" };
      let next: BudgetData;
      if (update.action === "setLimit") next = { ...base, limit: update.amount };
      else if (update.action === "setSpent") next = { ...base, spent: update.amount };
      else next = { ...base, spent: base.spent + update.amount };
      return next;
    });

    // Flash the barometer to signal auto-update
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "radial-gradient(ellipse at top, #0d0735 0%, #05031a 60%)" }}>
      <Stars />

      {showModal && (
        <SetBudgetModal
          current={budget}
          onSave={(d) => { setBudget(d); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* ── Header ── */}
        <header className="flex-shrink-0 px-5 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white animate-pulse-glow" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "1.5px solid rgba(139,92,246,.5)" }}>SB</div>
            <span className="text-base font-semibold text-purple-100">Smart Budget</span>
          </div>
          <nav className="hidden md:flex items-center gap-5">
            {["Features", "How it works", "About"].map(item => (
              <a key={item} href="#" className="text-sm text-purple-300 hover:text-purple-100 transition-colors">{item}</a>
            ))}
          </nav>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-[.97]"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "1px solid rgba(139,92,246,.4)", color: "#fff" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Set Budget
          </button>
        </header>

        {/* ── Main two-column layout ── */}
        <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0 px-5 pb-4 max-w-7xl mx-auto w-full">

          {/* Left panel – scrollable */}
          <section className="lg:flex-1 overflow-y-auto pr-0 lg:pr-6 pb-4 lg:pb-0 flex flex-col gap-4 custom-scroll">
            <div className="pt-4 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-medium" style={{ background: "rgba(99,79,167,.18)", border: "0.5px solid rgba(139,92,246,.28)", color: "#a78bca" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                AI-powered budget assistant — online now
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold leading-snug">
                <span className="text-purple-100">Meet </span><span className="gradient-text">Frank</span>
                <br /><span className="text-purple-100">your budget buddy</span>
              </h1>

              <p className="text-sm text-purple-300 leading-relaxed max-w-xs">
                Chat with Frank to track spending and manage your budget. Frank listens — mention amounts or budgets and the barometer updates live.
              </p>

              {/* Budget barometer or prompt */}
              {budget ? (
                <BudgetBarometer budget={budget} onEdit={() => setShowModal(true)} flash={flash} />
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:opacity-90 active:scale-[.98] transition-all w-full"
                  style={{ background: "rgba(99,79,167,.15)", border: "0.5px solid rgba(139,92,246,.32)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>🎯</div>
                  <div className="flex-1">
                    <p className="text-purple-100 text-sm font-semibold">Set your monthly budget</p>
                    <p className="text-purple-500 text-xs mt-0.5">The barometer auto-updates as you chat</p>
                  </div>
                  <svg className="text-purple-500 flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}

              {/* Hint pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "💬", label: "\"I spent R500 on food\"" },
                  { icon: "🎯", label: "\"My budget is R3000\"" },
                  { icon: "💰", label: "Save money tips" },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "rgba(99,79,167,.16)", border: "0.5px solid rgba(139,92,246,.24)", color: "#a78bca" }}>
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex gap-7 pt-1">
                {[{ v: "10k+", l: "Users helped" }, { v: "98%", l: "Satisfaction" }, { v: "24/7", l: "Available" }].map(({ v, l }) => (
                  <div key={l}>
                    <p className="text-xl font-bold gradient-text">{v}</p>
                    <p className="text-xs text-purple-400 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  { icon: "🎯", t: "Smart Budgeting", d: "Create personalised budgets tailored to your income and goals." },
                  { icon: "📈", t: "Savings Goals", d: "Set targets and get step-by-step guidance on reaching them faster." },
                  { icon: "🔍", t: "Expense Insights", d: "Understand where your money goes and cut unnecessary spending." },
                ].map(({ icon, t, d }) => (
                  <div key={t} className="glass-card rounded-xl p-4 flex gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(99,79,167,.25)" }}>{icon}</div>
                    <div>
                      <p className="text-purple-100 font-semibold text-sm">{t}</p>
                      <p className="text-purple-400 text-xs mt-0.5 leading-relaxed">{d}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 pb-1 border-t border-purple-900/30">
                <p className="text-purple-600 text-xs">© 2026 Smart Budget</p>
                <div className="flex gap-3">
                  {["Privacy", "Terms", "Contact"].map(i => (
                    <a key={i} href="#" className="text-purple-600 text-xs hover:text-purple-400 transition-colors">{i}</a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Right panel – chatbot, fills height */}
          <section className="flex-shrink-0 lg:w-[460px] flex flex-col min-h-[420px] lg:min-h-0">
            <div className="glass-card rounded-2xl p-1.5 relative h-full flex flex-col" style={{ minHeight: "420px" }}>
              <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{ background: "linear-gradient(135deg,rgba(139,92,246,.12),rgba(79,70,229,.06))" }} />
              <div className="flex-1 relative" style={{ minHeight: 0 }}>
                <VoiceflowWidget onMessage={handleChatMessage} />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
