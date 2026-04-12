import { useEffect, useRef } from "react";

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
    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
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
        voice: {
          url: "https://runtime-api.voiceflow.com",
        },
        render: {
          mode: "embedded",
          target: document.getElementById("voiceflow-chat"),
        },
      });
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div
      id="voiceflow-chat"
      className="w-full rounded-2xl overflow-hidden"
      style={{ minHeight: "560px" }}
    />
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <Stars />

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
            <span className="text-lg font-semibold text-purple-100">
              Smart Budget
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {["Features", "How it works", "About"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm text-purple-300 hover:text-purple-100 transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>
          <button
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "1px solid rgba(139,92,246,.4)",
              color: "#fff",
            }}
          >
            Get started
          </button>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row items-center gap-12 px-6 py-10 max-w-6xl mx-auto w-full">
          <section
            className="flex-1 flex flex-col gap-6 animate-fade-in-up"
            style={{ animationDelay: "0s" }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-xs font-medium"
              style={{
                background: "rgba(99,79,167,.18)",
                border: "0.5px solid rgba(139,92,246,.28)",
                color: "#a78bca",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-green-400"
                style={{ animation: "pulse-glow 2s infinite" }}
              />
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
              Ask Frank anything about managing money — budgeting, saving,
              tracking expenses, or building financial habits that actually stick.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
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

            <div className="flex flex-wrap gap-8 mt-4">
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

          <section
            className="w-full max-w-md lg:max-w-lg flex-shrink-0 animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="glass-card rounded-2xl p-2 relative">
              <div
                className="absolute -inset-px rounded-2xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,.15) 0%, rgba(79,70,229,.08) 100%)",
                }}
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
              Frank combines smart AI with deep personal finance knowledge to
              give you practical, actionable advice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: "🎯",
                title: "Smart Budgeting",
                desc: "Create personalised budgets tailored to your income, lifestyle, and financial goals.",
              },
              {
                icon: "📈",
                title: "Savings Goals",
                desc: "Set savings targets and get step-by-step guidance on how to reach them faster.",
              },
              {
                icon: "🔍",
                title: "Expense Insights",
                desc: "Understand where your money goes and discover easy ways to cut unnecessary spending.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="glass-card rounded-2xl p-6 flex flex-col gap-3 animate-fade-in-up"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(99,79,167,.25)" }}
                >
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
            <p className="text-purple-500 text-xs">
              © 2026 Smart Budget. Your financial journey starts here.
            </p>
            <div className="flex gap-4">
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-purple-500 text-xs hover:text-purple-300 transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
