import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    voiceflow?: {
      chat: {
        load: (config: Record<string, unknown>) => void;
        interact: (action: { type: string; payload?: unknown }) => void;
      };
    };
    __vfFetchPatched?: boolean;
  }
}

/* ─────────────────────────────────────────────
   Send a pre-written message into the Voiceflow chat.
   Tries the interact() API first; falls back to
   DOM-based input injection.
───────────────────────────────────────────── */
function sendToChat(message: string) {
  try {
    (window.voiceflow?.chat as { interact?: (a: unknown) => void })?.interact?.({
      type: "text",
      payload: message,
    });
    return;
  } catch {}

  // Fallback: find the widget's text input and submit it
  const inputEl = document.querySelector<HTMLElement>(
    '[contenteditable="true"], textarea, input[type="text"]'
  );
  if (!inputEl) return;
  inputEl.focus();
  if (inputEl instanceof HTMLTextAreaElement || inputEl instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(
      inputEl instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
      "value"
    )?.set;
    setter?.call(inputEl, message);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (inputEl.isContentEditable) {
    inputEl.textContent = message;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }
  inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  inputEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true }));
}

/* ─────────────────────────────────────────────
   Stars background
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Budget types & parser
───────────────────────────────────────────── */
interface BudgetData { limit: number; spent: number; label: string; currency: string }

type BudgetUpdate =
  | { action: "setLimit"; amount: number }
  | { action: "addSpent"; amount: number }
  | { action: "setSpent"; amount: number };

function parseChatText(raw: string): BudgetUpdate | null {
  const text = raw.toLowerCase();
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

/* ─────────────────────────────────────────────
   Fetch interceptor — installed once globally
   Listens to every Voiceflow runtime call and
   forwards message text to a callback.
───────────────────────────────────────────── */
type MsgCallback = (text: string) => void;
const vfListeners = new Set<MsgCallback>();

function installFetchInterceptor() {
  if (window.__vfFetchPatched) return;
  window.__vfFetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;

    // Only intercept Voiceflow runtime "interact" calls (user messages)
    if (url.includes("general-runtime.voiceflow.com") && url.includes("interact") && init?.body) {
      try {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
        const payload = body?.action?.payload;
        if (typeof payload === "string" && payload.trim()) {
          vfListeners.forEach((cb) => cb(payload.trim()));
        }
      } catch {}
    }

    return originalFetch(input, init);
  };
}

/* ─────────────────────────────────────────────
   Voiceflow embedded widget
───────────────────────────────────────────── */
function VoiceflowWidget({ onMessage }: { onMessage: (text: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Keep listener ref fresh
  useEffect(() => {
    vfListeners.add(onMessage);
    return () => { vfListeners.delete(onMessage); };
  }, [onMessage]);

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
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.voiceflow.com/widget-next/bundle.mjs"]'
    );
    if (existing) { existing.addEventListener("load", initWidget, { once: true }); return; }
    const s = document.getElementsByTagName("script")[0];
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
    script.addEventListener("load", initWidget, { once: true });
    s.parentNode!.insertBefore(script, s);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: "100%", minHeight: "480px" }}
    />
  );
}

/* ─────────────────────────────────────────────
   Set Budget modal
───────────────────────────────────────────── */
interface BudgetModalProps {
  current: BudgetData | null;
  onSave: (d: BudgetData) => void;
  onClose: () => void;
}
function SetBudgetModal({ current, onSave, onClose }: BudgetModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,3,26,.88)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 animate-fade-in-up"
        style={{ background: "linear-gradient(160deg,rgba(13,7,53,.99),rgba(8,4,43,.99))", border: "0.5px solid rgba(139,92,246,.45)", boxShadow: "0 0 60px rgba(99,79,167,.35)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-purple-100 font-semibold">Set Your Budget</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors" style={{ background: "rgba(99,79,167,.2)" }}>✕</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <ModalField label="Budget label">
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Monthly budget goal" className="input-field" />
          </ModalField>
          <div className="flex gap-3">
            <ModalField label="Currency" className="w-20">
              <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} maxLength={3} className="input-field text-center" />
            </ModalField>
            <ModalField label="Budget limit" className="flex-1">
              <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="3000" min="1" required className="input-field" />
            </ModalField>
          </div>
          <ModalField label="Amount spent so far">
            <input type="number" value={spent} onChange={e => setSpent(e.target.value)} placeholder="0" min="0" className="input-field" />
          </ModalField>
          <button type="submit" className="mt-1 w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            Save Budget
          </button>
        </form>
      </div>
    </div>
  );
}
function ModalField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs text-purple-400 font-medium">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   How It Works modal
───────────────────────────────────────────── */
function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      num: "01",
      icon: "🎯",
      title: "Set your budget limit",
      desc: 'Click "Set Budget" and enter your monthly spending limit — for example R3,000. You can also enter how much you\'ve already spent this month.',
    },
    {
      num: "02",
      icon: "💬",
      title: "Chat with Frank",
      desc: 'Tell Frank what you\'ve spent in plain language — for example "I spent R500 on groceries" or "I paid R200 for electricity." Frank understands natural conversation.',
    },
    {
      num: "03",
      icon: "📊",
      title: "Watch the barometer update",
      desc: "The budget barometer on the left reads every message and automatically moves the bar when it detects a spending amount. No manual entry needed.",
    },
    {
      num: "04",
      icon: "⚠️",
      title: "Get alerts before you overspend",
      desc: "The bar turns amber when you hit 70% of your limit and red at 90%. Frank can also give you personalised advice on how to cut back and save more.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,3,26,.9)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl p-7 flex flex-col gap-6 animate-fade-in-up"
        style={{ background: "linear-gradient(160deg,rgba(13,7,53,.99),rgba(8,4,43,.99))", border: "0.5px solid rgba(139,92,246,.4)", boxShadow: "0 0 70px rgba(99,79,167,.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-purple-100 font-bold text-lg">How Smart Budget Works</h2>
            <p className="text-purple-400 text-sm mt-1">Four simple steps to take control of your money</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors flex-shrink-0 ml-4" style={{ background: "rgba(99,79,167,.2)" }}>✕</button>
        </div>

        <div className="flex flex-col gap-4">
          {steps.map(({ num, icon, title, desc }) => (
            <div key={num} className="flex gap-4 p-4 rounded-xl" style={{ background: "rgba(99,79,167,.1)", border: "0.5px solid rgba(139,92,246,.18)" }}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg,rgba(124,58,237,.4),rgba(79,70,229,.3))", border: "0.5px solid rgba(139,92,246,.3)" }}>{icon}</div>
                <span className="text-xs font-bold text-purple-600">{num}</span>
              </div>
              <div>
                <p className="text-purple-100 font-semibold text-sm">{title}</p>
                <p className="text-purple-400 text-xs leading-relaxed mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4" style={{ background: "rgba(74,222,128,.07)", border: "0.5px solid rgba(74,222,128,.25)" }}>
          <p className="text-xs text-green-300 leading-relaxed">
            <span className="font-semibold">Quick tip:</span> Try saying <span className="font-mono bg-green-900/30 px-1 rounded">"My budget is R5000"</span> to set your limit directly in the chat, or <span className="font-mono bg-green-900/30 px-1 rounded">"I spent R800 on rent"</span> to log an expense — the barometer updates instantly.
          </p>
        </div>

        <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[.98] transition-all" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
          Got it — start chatting
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Expense Insights modal
───────────────────────────────────────────── */
function ExpenseInsightsModal({
  budget,
  chatHistory,
  onClose,
  onAskFrank,
}: {
  budget: BudgetData | null;
  chatHistory: string[];
  onClose: () => void;
  onAskFrank: (msg: string) => void;
}) {
  const pct = budget ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;

  // Extract expense mentions from chat
  const expenseMentions = chatHistory.filter(t =>
    /\b(?:spent|paid|bought|cost|expense|bill|fee)\b/i.test(t) &&
    /\d/.test(t)
  );

  // Generate contextual savings tips
  const tips: { icon: string; title: string; body: string }[] = [];

  if (!budget) {
    tips.push({ icon: "🎯", title: "Set a budget first", body: "Tap \"Set Budget\" or tell Frank your limit — e.g. \"My budget is R5000\" — so we can give you personalised insights." });
  } else {
    if (pct >= 90) {
      tips.push({ icon: "🚨", title: "You're very close to your limit", body: `You've used ${Math.round(pct)}% of your ${budget.currency}${budget.limit.toLocaleString()} budget. Pause non-essential spending for the rest of the month.` });
      tips.push({ icon: "🛒", title: "Switch to essentials only", body: "Groceries, transport, and utilities first. Delay any shopping, dining out, or entertainment until next month." });
      tips.push({ icon: "📦", title: "Check for unused subscriptions", body: "Apps, streaming, or gym memberships you're not using add up fast. Cancel at least one this week." });
    } else if (pct >= 70) {
      tips.push({ icon: "⚠️", title: "Slow down spending now", body: `You're at ${Math.round(pct)}% with ${budget.currency}${Math.max(budget.limit - budget.spent, 0).toLocaleString()} remaining. Aim to stretch that across the rest of the month.` });
      tips.push({ icon: "🍱", title: "Meal prep instead of takeaways", body: "Cooking at home for 3–4 days a week can cut food costs by 40–60% compared to eating out or ordering delivery." });
      tips.push({ icon: "📊", title: "Review your biggest expense", body: "Ask Frank: \"What should I cut to stay under budget?\" and share what you've spent the most on." });
    } else {
      tips.push({ icon: "✅", title: "You're on track — keep it up", body: `Only ${Math.round(pct)}% used. Staying disciplined now means you'll have breathing room at the end of the month.` });
      tips.push({ icon: "💰", title: "Put the surplus to work", body: `You have ${budget.currency}${Math.max(budget.limit - budget.spent, 0).toLocaleString()} left. Consider moving 20–30% of it into savings before it gets spent.` });
      tips.push({ icon: "🎯", title: "Set a savings sub-goal", body: "Tell Frank what you're saving toward — a holiday, emergency fund, or gadget — and he'll build you a step-by-step plan." });
    }

    if (expenseMentions.length > 0) {
      tips.push({ icon: "🔍", title: `${expenseMentions.length} expense${expenseMentions.length > 1 ? "s" : ""} logged this session`, body: `You've mentioned ${expenseMentions.length} spending item${expenseMentions.length > 1 ? "s" : ""} in chat. Ask Frank to categorise them and find where you can save most.` });
    }
  }

  const frankMsg = budget && pct >= 70
    ? `I've spent ${budget.currency}${budget.spent.toLocaleString()} out of my ${budget.currency}${budget.limit.toLocaleString()} budget. How can I cut back and save money this month?`
    : "Can you give me personalised tips on how to save money and reduce unnecessary spending?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,3,26,.9)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl p-7 flex flex-col gap-5 animate-fade-in-up"
        style={{ background: "linear-gradient(160deg,rgba(13,7,53,.99),rgba(8,4,43,.99))", border: "0.5px solid rgba(139,92,246,.4)", boxShadow: "0 0 70px rgba(99,79,167,.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-purple-100 font-bold text-lg">Expense Insights</h2>
            <p className="text-purple-400 text-sm mt-0.5">
              {budget
                ? `Personalised tips based on your ${Math.round(pct)}% spend`
                : "Set a budget to unlock personalised tips"}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors flex-shrink-0 ml-4" style={{ background: "rgba(99,79,167,.2)" }}>✕</button>
        </div>

        {budget && (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(99,79,167,.12)", border: "0.5px solid rgba(139,92,246,.2)" }}>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-400">Budget used</span>
                <span className="font-semibold" style={{ color: pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#4ade80" }}>{Math.round(pct)}%</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(99,79,167,.25)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 90 ? "linear-gradient(90deg,#7c3aed,#ef4444)" : pct >= 70 ? "linear-gradient(90deg,#7c3aed,#f59e0b)" : "linear-gradient(90deg,#7c3aed,#4f46e5)" }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-purple-100 text-sm font-bold">{budget.currency}{budget.spent.toLocaleString()}</p>
              <p className="text-purple-500 text-xs">of {budget.currency}{budget.limit.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {tips.map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3 p-3.5 rounded-xl" style={{ background: "rgba(99,79,167,.1)", border: "0.5px solid rgba(139,92,246,.18)" }}>
              <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-purple-100 font-semibold text-sm">{title}</p>
                <p className="text-purple-400 text-xs leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { onAskFrank(frankMsg); onClose(); }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[.98] transition-all flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
        >
          <span>💬</span> Ask Frank for personalised advice
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Budget barometer
───────────────────────────────────────────── */
function BudgetBarometer({ budget, onEdit, flash }: { budget: BudgetData; onEdit: () => void; flash: boolean }) {
  const pct = Math.min((budget.spent / budget.limit) * 100, 100);
  const remaining = Math.max(budget.limit - budget.spent, 0);
  const isOver = budget.spent > budget.limit;
  const barColor = pct >= 90 ? "linear-gradient(90deg,#7c3aed,#ef4444)" : pct >= 70 ? "linear-gradient(90deg,#7c3aed,#f59e0b)" : "linear-gradient(90deg,#7c3aed,#4f46e5)";
  const alertColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#4ade80";
  const alertMsg = isOver
    ? `You've exceeded your budget by ${budget.currency}${(budget.spent - budget.limit).toLocaleString()}.`
    : pct >= 90 ? `You're at ${Math.round(pct)}% — almost at your limit!`
    : pct >= 70 ? `You've used ${Math.round(pct)}% — keep an eye on spending.`
    : `You're on track — ${Math.round(pct)}% used.`;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-500"
      style={{ background: flash ? "rgba(124,58,237,.18)" : "linear-gradient(160deg,rgba(13,7,53,.92),rgba(8,4,43,.95))", border: flash ? "0.5px solid rgba(139,92,246,.7)" : "0.5px solid rgba(139,92,246,.25)", boxShadow: flash ? "0 0 24px rgba(124,58,237,.45)" : "0 0 30px rgba(99,79,167,.1)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(99,79,167,.25)" }}>🎯</div>
          <div>
            <p className="text-purple-100 font-semibold text-sm leading-tight">{budget.label}</p>
            <p className="text-purple-400 text-xs mt-0.5">{budget.currency}{budget.spent.toLocaleString()} of {budget.currency}{budget.limit.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {flash && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium animate-fade-in-up" style={{ background: "rgba(124,58,237,.25)", color: "#c4b5fd" }}>
              auto-updated ✨
            </span>
          )}
          <div className="text-right mr-1">
            <p className="text-sm font-bold" style={{ color: isOver ? "#ef4444" : "#e2d9f3" }}>{budget.currency}{remaining.toLocaleString()}</p>
            <p className="text-xs text-purple-500">{isOver ? "over" : "left"}</p>
          </div>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-200 transition-colors text-xs" style={{ background: "rgba(99,79,167,.18)", border: "0.5px solid rgba(139,92,246,.22)" }} title="Edit">✏️</button>
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
          {[25, 50, 75].map(mk => (
            <div key={mk} className="absolute top-0 bottom-0 w-px" style={{ left: `${mk}%`, background: "rgba(255,255,255,.12)" }} />
          ))}
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

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function Home() {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showHowModal, setShowHowModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [flash, setFlash] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  // Install the fetch interceptor once when the page loads
  useEffect(() => { installFetchInterceptor(); }, []);

  const handleChatMessage = useCallback((text: string) => {
    // Always record the raw message
    setChatHistory((h) => [...h, text]);

    const update = parseChatText(text);
    if (!update) return;

    setBudget((prev) => {
      const base = prev ?? { limit: 0, spent: 0, label: "Monthly budget goal", currency: "R" };
      if (update.action === "setLimit") return { ...base, limit: update.amount };
      if (update.action === "setSpent") return { ...base, spent: update.amount };
      return { ...base, spent: base.spent + update.amount };
    });

    setFlash(true);
    setTimeout(() => setFlash(false), 2500);
  }, []);

  function handleSendToChat(msg: string) {
    sendToChat(msg);
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "radial-gradient(ellipse at top,#0d0735 0%,#05031a 60%)" }}>
      <Stars />

      {showBudgetModal && (
        <SetBudgetModal
          current={budget}
          onSave={(d) => { setBudget(d); setShowBudgetModal(false); }}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
      {showHowModal && <HowItWorksModal onClose={() => setShowHowModal(false)} />}
      {showInsightsModal && (
        <ExpenseInsightsModal
          budget={budget}
          chatHistory={chatHistory}
          onClose={() => setShowInsightsModal(false)}
          onAskFrank={(msg) => { handleSendToChat(msg); }}
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex-shrink-0 px-5 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white animate-pulse-glow" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "1.5px solid rgba(139,92,246,.5)" }}>SB</div>
            <span className="text-base font-semibold text-purple-100">Smart Budget</span>
          </div>
          <nav className="hidden md:flex items-center gap-5">
            <a href="#" className="text-sm text-purple-300 hover:text-purple-100 transition-colors">Features</a>
            <button
              onClick={() => setShowHowModal(true)}
              className="text-sm text-purple-300 hover:text-purple-100 transition-colors"
            >
              How it works
            </button>
            <a href="#" className="text-sm text-purple-300 hover:text-purple-100 transition-colors">About</a>
          </nav>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-[.97]"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "1px solid rgba(139,92,246,.4)", color: "#fff" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Set Budget
          </button>
        </header>

        {/* Two-column main */}
        <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0 px-5 pb-4 max-w-7xl mx-auto w-full">

          {/* Left – scrollable content */}
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
                Chat with Frank to track spending. Mention an amount and the barometer updates live — no manual entry needed.
              </p>

              {/* Barometer or setup prompt */}
              {budget ? (
                <BudgetBarometer budget={budget} onEdit={() => setShowBudgetModal(true)} flash={flash} />
              ) : (
                <button
                  onClick={() => setShowBudgetModal(true)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:opacity-90 active:scale-[.98] transition-all w-full"
                  style={{ background: "rgba(99,79,167,.15)", border: "0.5px solid rgba(139,92,246,.32)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>🎯</div>
                  <div className="flex-1">
                    <p className="text-purple-100 text-sm font-semibold">Set your monthly budget</p>
                    <p className="text-purple-500 text-xs mt-0.5">The bar auto-updates as you chat with Frank</p>
                  </div>
                  <svg className="text-purple-500 flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}

              {/* Example phrases */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-purple-600 font-medium">Try saying to Frank:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: "💬", label: '"I spent R500 on food"' },
                    { icon: "🎯", label: '"My budget is R3000"' },
                    { icon: "💰", label: '"Save money tips"' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs hover:opacity-80 transition-opacity" style={{ background: "rgba(99,79,167,.16)", border: "0.5px solid rgba(139,92,246,.24)", color: "#a78bca" }}>
                      <span>{icon}</span><span>{label}</span>
                    </div>
                  ))}
                </div>
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

              {/* Feature cards — clickable */}
              <div className="flex flex-col gap-3 pt-2">
                {/* Smart Budgeting */}
                <button
                  onClick={() => handleSendToChat("I want to create a personalised budget based on my income and financial goals. Can you help me build one step by step?")}
                  className="glass-card rounded-xl p-4 flex gap-3 text-left w-full hover:opacity-80 active:scale-[.99] transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: "rgba(99,79,167,.25)" }}>🎯</div>
                  <div className="flex-1">
                    <p className="text-purple-100 font-semibold text-sm">Smart Budgeting</p>
                    <p className="text-purple-400 text-xs mt-0.5 leading-relaxed">Create personalised budgets tailored to your income and goals.</p>
                  </div>
                  <svg className="text-purple-600 flex-shrink-0 self-center group-hover:text-purple-400 transition-colors" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>

                {/* Savings Goals */}
                <button
                  onClick={() => handleSendToChat("I want to set up savings goals. Can you give me a step-by-step plan to reach them faster based on my income and spending?")}
                  className="glass-card rounded-xl p-4 flex gap-3 text-left w-full hover:opacity-80 active:scale-[.99] transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: "rgba(99,79,167,.25)" }}>📈</div>
                  <div className="flex-1">
                    <p className="text-purple-100 font-semibold text-sm">Savings Goals</p>
                    <p className="text-purple-400 text-xs mt-0.5 leading-relaxed">Set targets and get step-by-step guidance on reaching them faster.</p>
                  </div>
                  <svg className="text-purple-600 flex-shrink-0 self-center group-hover:text-purple-400 transition-colors" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>

                {/* Expense Insights */}
                <button
                  onClick={() => setShowInsightsModal(true)}
                  className="glass-card rounded-xl p-4 flex gap-3 text-left w-full hover:opacity-80 active:scale-[.99] transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: "rgba(99,79,167,.25)" }}>🔍</div>
                  <div className="flex-1">
                    <p className="text-purple-100 font-semibold text-sm">Expense Insights</p>
                    <p className="text-purple-400 text-xs mt-0.5 leading-relaxed">See personalised savings tips based on what you've shared with Frank.</p>
                  </div>
                  <svg className="text-purple-600 flex-shrink-0 self-center group-hover:text-purple-400 transition-colors" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
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

          {/* Right – chatbot panel */}
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
