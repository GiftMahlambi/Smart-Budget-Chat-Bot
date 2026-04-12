import { useEffect, useRef, useState } from "react";

function Stars() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    for (let i = 0; i < 140; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = Math.random() * 2.5 + 0.4;
      s.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random() * 100}%;
        left:${Math.random() * 100}%;
        opacity:${Math.random() * 0.7 + 0.1};
        animation-duration:${Math.random() * 4 + 2}s;
        animation-delay:${Math.random() * 5}s;
      `;
      container.appendChild(s);
    }
    return () => { container.innerHTML = ""; };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
  );
}

function VoiceflowWidget() {
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://cdn.voiceflow.com/widget-next/bundle.mjs"]'
    );
    if (existingScript) return;

    const target = document.getElementById("voiceflow-chat");
    if (!target) return;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
    script.onload = function () {
      (window as any).voiceflow?.chat?.load({
        verify: { projectID: "69dbef45529f718cef5279b8" },
        url: "https://general-runtime.voiceflow.com",
        versionID: "production",
        voice: { url: "https://runtime-api.voiceflow.com" },
        render: {
          mode: "embedded",
          target: document.getElementById("voiceflow-chat"),
        },
      });
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div id="voiceflow-chat" className="w-full rounded-2xl overflow-hidden" style={{ minHeight: "560px" }} />
  );
}

interface BudgetData {
  limit: number;
  spent: number;
  label: string;
  currency: string;
}

function SetBudgetModal({
  current,
  onSave,
  onClose,
}: {
  current: BudgetData | null;
  onSave: (data: BudgetData) => void;
  onClose: () => void;
}) {
  const [limit, setLimit] = useState(current?.limit?.toString() ?? "");
  const [spent, setSpent] = useState(current?.spent?.toString() ?? "");
  const [label, setLabel] = useState(current?.label ?? "Monthly budget goal");
  const [currency, setCurrency] = useState(current?.currency ?? "R");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const l = parseFloat(limit);
    const s = parseFloat(spent);
    if (isNaN(l) || l <= 0) return;
    onSave({ limit: l, spent: isNaN(s) ? 0 : s, label, currency });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5, 3, 26, 0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-in-up"
        style={{
          background: "linear-gradient(160deg, rgba(13,7,53,.98) 0%, rgba(8,4,43,.99) 100%)",
          border: "0.5px solid rgba(139,92,246,.4)",
          boxShadow: "0 0 60px rgba(99,79,167,.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-purple-100 font-semibold text-base">Set Your Budget</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors"
            style={{ background: "rgba(99,79,167,.18)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-purple-400 font-medium">Budget label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Monthly budget goal"
              className="rounded-xl px-4 py-2.5 text-sm text-purple-100 outline-none transition-colors"
              style={{
                background: "rgba(99,79,167,.15)",
                border: "0.5px solid rgba(139,92,246,.35)",
              }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 w-20">
              <label className="text-xs text-purple-400 font-medium">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
                className="rounded-xl px-3 py-2.5 text-sm text-purple-100 outline-none text-center"
                style={{
                  background: "rgba(99,79,167,.15)",
                  border: "0.5px solid rgba(139,92,246,.35)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs text-purple-400 font-medium">Budget limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="e.g. 3000"
                min="1"
                required
                className="rounded-xl px-4 py-2.5 text-sm text-purple-100 outline-none"
                style={{
                  background: "rgba(99,79,167,.15)",
                  border: "0.5px solid rgba(139,92,246,.35)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-purple-400 font-medium">Amount spent so far</label>
            <input
              type="number"
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              placeholder="e.g. 2800"
              min="0"
              className="rounded-xl px-4 py-2.5 text-sm text-purple-100 outline-none"
              style={{
                background: "rgba(99,79,167,.15)",
                border: "0.5px solid rgba(139,92,246,.35)",
              }}
            />
          </div>

          <button
            type="submit"
            className="mt-1 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[.98]"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            Save Budget
          </button>
        </form>
      </div>
    </div>
  );
}

function BudgetBarometer({
  budget,
  onEdit,
}: {
  budget: BudgetData;
  onEdit: () => void;
}) {
  const pct = Math.min((budget.spent / budget.limit) * 100, 100);
  const remaining = Math.max(budget.limit - budget.spent, 0);
  const isOver = budget.spent > budget.limit;

  const barColor =
    pct >= 90
      ? "linear-gradient(90deg, #7c3aed, #ef4444)"
      : pct >= 70
      ? "linear-gradient(90deg, #7c3aed, #f59e0b)"
      : "linear-gradient(90deg, #7c3aed, #4f46e5)";

  const alertColor =
    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#4ade80";

  const alertMsg = isOver
    ? `You've exceeded your budget by ${budget.currency}${(budget.spent - budget.limit).toLocaleString()}.`
    : pct >= 90
    ? `You're at ${Math.round(pct)}% of your ${budget.label.toLowerCase()}.`
    : pct >= 70
    ? `You've used ${Math.round(pct)}% of your budget. Keep an eye on spending.`
    : `You're on track — ${Math.round(pct)}% of your budget used.`;

  const alertIcon = isOver ? "🚨" : pct >= 90 ? "⚠️" : pct >= 70 ? "💛" : "✅";

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 animate-fade-in-up"
      style={{
        background: "linear-gradient(160deg, rgba(13,7,53,.92) 0%, rgba(8,4,43,.95) 100%)",
        border: "0.5px solid rgba(139,92,246,.25)",
        boxShadow: "0 0 40px rgba(99,79,167,.12)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(99,79,167,.25)", border: "0.5px solid rgba(139,92,246,.3)" }}
          >
            🎯
          </div>
          <div>
            <p className="text-purple-100 font-semibold text-sm">{budget.label}</p>
            <p className="text-purple-400 text-xs mt-0.5">
              {budget.currency}{budget.spent.toLocaleString()} spent of {budget.currency}{budget.limit.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className="text-sm font-bold"
              style={{ color: isOver ? "#ef4444" : "#e2d9f3" }}
            >
              {budget.currency}{remaining.toLocaleString()}
            </p>
            <p className="text-xs text-purple-500">{isOver ? "over limit" : "left"}</p>
          </div>
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors text-xs"
            style={{ background: "rgba(99,79,167,.18)", border: "0.5px solid rgba(139,92,246,.25)" }}
            title="Edit budget"
          >
            ✏️
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-purple-500">{budget.currency}0</span>
          <span className="text-xs font-semibold" style={{ color: alertColor }}>
            {Math.round(pct)}%
          </span>
          <span className="text-xs text-purple-500">{budget.currency}{budget.limit.toLocaleString()}</span>
        </div>

        <div
          className="w-full h-3 rounded-full overflow-hidden relative"
          style={{ background: "rgba(99,79,167,.2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: barColor,
              boxShadow: pct >= 90 ? "0 0 10px rgba(239,68,68,.5)" : "0 0 10px rgba(124,58,237,.4)",
            }}
          />

          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${mark}%`,
                background: "rgba(255,255,255,.12)",
              }}
            />
          ))}
        </div>

        <div className="flex justify-between text-xs text-purple-600 mt-0.5">
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
        style={{
          background: `${alertColor}14`,
          border: `0.5px solid ${alertColor}40`,
          color: alertColor,
        }}
      >
        <span>{alertIcon}</span>
        <span>{alertMsg}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <Stars />

      {showModal && (
        <SetBudgetModal
          current={budget}
          onSave={(data) => { setBudget(data); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white animate-pulse-glow"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border: "1.5px solid rgba(139,92,246,.5)",
              }}
            >
              SB
            </div>
            <span className="text-lg font-semibold text-purple-100">Smart Budget</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {["Features", "How it works", "About"].map((item) => (
              <a key={item} href="#" className="text-sm text-purple-300 hover:text-purple-100 transition-colors duration-200">
                {item}
              </a>
            ))}
          </nav>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[.97]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "1px solid rgba(139,92,246,.4)",
              color: "#fff",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Set Budget
          </button>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row items-start gap-12 px-6 py-10 max-w-6xl mx-auto w-full">
          <section className="flex-1 flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: "0s" }}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-medium"
              style={{
                background: "rgba(99,79,167,.18)",
                border: "0.5px solid rgba(139,92,246,.28)",
                color: "#a78bca",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              AI-powered budget assistant — online now
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="text-purple-100">Meet </span>
              <span className="gradient-text">Frank</span>
              <br />
              <span className="text-purple-100">your personal</span>
              <br />
              <span className="text-purple-100">budget buddy</span>
            </h1>

            <p className="text-base text-purple-300 leading-relaxed max-w-sm">
              Ask Frank anything about managing money — budgeting, saving, tracking expenses, or building financial habits that actually stick.
            </p>

            {budget ? (
              <BudgetBarometer budget={budget} onEdit={() => setShowModal(true)} />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { icon: "💬", label: "How do I create a budget?" },
                    { icon: "💰", label: "Save money tips" },
                    { icon: "📊", label: "Track expenses" },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 hover:opacity-80"
                      style={{
                        background: "rgba(99,79,167,.18)",
                        border: "0.5px solid rgba(139,92,246,.28)",
                        color: "#a78bca",
                      }}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all duration-200 hover:opacity-90 active:scale-[.98] w-fit"
                  style={{
                    background: "rgba(99,79,167,.18)",
                    border: "0.5px solid rgba(139,92,246,.35)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                  >
                    🎯
                  </div>
                  <div>
                    <p className="text-purple-100 text-sm font-semibold">Set your monthly budget</p>
                    <p className="text-purple-500 text-xs mt-0.5">Track how far you are from your limit</p>
                  </div>
                  <svg className="ml-2 text-purple-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-8 mt-2">
              {[
                { value: "10k+", label: "Users helped" },
                { value: "98%", label: "Satisfaction" },
                { value: "24/7", label: "Available" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-2xl font-bold gradient-text">{value}</span>
                  <span className="text-xs text-purple-400 mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full max-w-md lg:max-w-lg flex-shrink-0 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="glass-card rounded-2xl p-2 relative">
              <div
                className="absolute -inset-px rounded-2xl pointer-events-none"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,.15) 0%, rgba(79,70,229,.08) 100%)" }}
              />
              <VoiceflowWidget />
            </div>
          </section>
        </main>

        <section className="px-6 py-16 max-w-6xl mx-auto w-full">
          <div className="text-center mb-10 animate-fade-in-up">
            <h2 className="text-2xl md:text-3xl font-bold text-purple-100 mb-3">
              Everything you need to take control of your finances
            </h2>
            <p className="text-purple-400 text-sm max-w-md mx-auto">
              Frank combines smart AI with deep personal finance knowledge to give you practical, actionable advice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: "🎯", title: "Smart Budgeting", desc: "Create personalised budgets tailored to your income, lifestyle, and financial goals." },
              { icon: "📈", title: "Savings Goals", desc: "Set savings targets and get step-by-step guidance on how to reach them faster." },
              { icon: "🔍", title: "Expense Insights", desc: "Understand where your money goes and discover easy ways to cut unnecessary spending." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="glass-card rounded-2xl p-6 flex flex-col gap-3 animate-fade-in-up">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(99,79,167,.25)" }}>
                  {icon}
                </div>
                <h3 className="text-purple-100 font-semibold text-sm">{title}</h3>
                <p className="text-purple-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="px-6 py-8 border-t border-purple-900/40">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                SB
              </div>
              <span className="text-purple-300 text-sm font-medium">Smart Budget</span>
            </div>
            <p className="text-purple-500 text-xs">© 2026 Smart Budget. Your financial journey starts here.</p>
            <div className="flex gap-4">
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a key={item} href="#" className="text-purple-500 text-xs hover:text-purple-300 transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
