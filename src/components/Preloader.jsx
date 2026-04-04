import { useState, useEffect } from "react";
import "./Preloader.css";

const pseudoRandom = (seed) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

function BugSVG({ className }) {
  return (
    <svg viewBox="0 0 120 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Subtle Shadow */}
      <ellipse cx="60" cy="150" rx="40" ry="10" fill="rgba(0,0,0,0.3)" />
      
      {/* Antennae - Sleeker */}
      <path d="M48 45 Q35 15 25 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <animate attributeName="d" values="M48 45 Q35 15 25 5;M48 45 Q32 18 22 8;M48 45 Q35 15 25 5" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M72 45 Q85 15 95 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <animate attributeName="d" values="M72 45 Q85 15 95 5;M72 45 Q88 18 98 8;M72 45 Q85 15 95 5" dur="0.8s" repeatCount="indefinite" />
      </path>

      {/* Head - More defined */}
      <ellipse cx="60" cy="50" rx="18" ry="16" fill="#2c3e50" />
      <circle cx="52" cy="46" r="3.5" fill="#e74c3c" opacity="0.9" />
      <circle cx="68" cy="46" r="3.5" fill="#e74c3c" opacity="0.9" />
      <circle cx="52" cy="45" r="1" fill="white" />
      <circle cx="68" cy="45" r="1" fill="white" />

      {/* Body segments - Premium Gradients */}
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#2c3e50" }} />
          <stop offset="50%" style={{ stopColor: "#34495e" }} />
          <stop offset="100%" style={{ stopColor: "#2c3e50" }} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="80" rx="24" ry="22" fill="url(#bodyGrad)" />
      <ellipse cx="60" cy="115" rx="28" ry="26" fill="#1a1a1a" />
      <ellipse cx="60" cy="140" rx="22" ry="20" fill="url(#bodyGrad)" />

      {/* Glossy highlight */}
      <path d="M50 70 Q60 65 70 70" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Legs - Sharper */}
      <g stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M38 75 Q20 70 5 60"><animate attributeName="d" values="M38 75 Q20 70 5 60;M38 75 Q15 65 2 55;M38 75 Q20 70 5 60" dur="0.4s" repeatCount="indefinite" /></path>
        <path d="M34 100 Q15 100 2 95"><animate attributeName="d" values="M34 100 Q15 100 2 95;M34 100 Q12 95 0 90;M34 100 Q15 100 2 95" dur="0.4s" repeatCount="indefinite" begin="0.1s" /></path>
        <path d="M38 125 Q20 130 5 135"><animate attributeName="d" values="M38 125 Q20 130 5 135;M38 125 Q15 125 2 130;M38 125 Q20 130 5 135" dur="0.4s" repeatCount="indefinite" begin="0.2s" /></path>
        
        <path d="M82 75 Q100 70 115 60"><animate attributeName="d" values="M82 75 Q100 70 115 60;M82 75 Q105 65 118 55;M82 75 Q100 70 115 60" dur="0.4s" repeatCount="indefinite" begin="0.2s" /></path>
        <path d="M86 100 Q105 100 118 95"><animate attributeName="d" values="M86 100 Q105 100 118 95;M86 100 Q108 95 120 90;M86 100 Q105 100 118 95" dur="0.4s" repeatCount="indefinite" begin="0.1s" /></path>
        <path d="M82 125 Q100 130 115 135"><animate attributeName="d" values="M82 125 Q100 130 115 135;M82 125 Q105 125 118 130;M82 125 Q100 130 115 135" dur="0.4s" repeatCount="indefinite" /></path>
      </g>
    </svg>
  );
}

function SprayNozzle({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="absolute top-1/2 left-[5%] sm:left-[15%] md:left-[25%] z-20"
      style={{ animation: "nozzleSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards" }}
    >
      <svg viewBox="0 0 120 60" className="w-24 h-12 sm:w-32 sm:h-16 md:w-40 md:h-20" fill="none">
        <defs>
          <linearGradient id="nozzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#95a5a6" }} />
            <stop offset="50%" style={{ stopColor: "#bdc3c7" }} />
            <stop offset="100%" style={{ stopColor: "#7f8c8d" }} />
          </linearGradient>
        </defs>
        {/* Main body */}
        <path d="M0 20 Q0 15 5 15 L70 10 Q80 10 80 20 L80 40 Q80 50 70 50 L5 45 Q0 45 0 40 Z" fill="url(#nozzleGrad)" />
        {/* Tip */}
        <rect x="80" y="22" width="15" height="16" rx="2" fill="#34495e" />
        <path d="M95 25 L108 22 L108 38 L95 35 Z" fill="#2c3e50" />
        {/* Detail */}
        <circle cx="87" cy="30" r="3" fill="#95a5a6" opacity="0.5" />
        {/* Gloss highlight */}
        <path d="M10 20 L60 18" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function SprayParticles({ visible }) {
  if (!visible) return null;

  const particleCount = 45;
  const spreadBase = typeof window !== "undefined" && window.innerWidth < 768 ? 200 : 350;

  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    tx: `${80 + pseudoRandom(i + 1) * spreadBase}px`,
    ty: `${(pseudoRandom(i + 101) - 0.5) * (spreadBase * 0.8)}px`,
    s: 1 + pseudoRandom(i + 201) * 2.5,
    delay: pseudoRandom(i + 301) * 0.8,
    duration: 0.6 + pseudoRandom(i + 401) * 0.8,
    size: 2 + pseudoRandom(i + 501) * 10,
    startY: (pseudoRandom(i + 601) - 0.5) * 15, // Tighter start Y for focused nozzle feel
  }));

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center overflow-visible">
      <div 
        className="absolute left-[30%] sm:left-[35%] md:left-[42%] top-1/2 -translate-y-1/2 flex items-center"
        style={{ animation: "nozzleSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards" }}
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full z-10"
            style={{
              left: "100px", // Anchor at nozzle tip
              top: `calc(50% + ${p.startY}px)`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(52, 152, 219, 0.4) 100%)`,
              "--tx": p.tx,
              "--ty": p.ty,
              "--s": p.s,
              animation: `sprayParticle ${p.duration}s ease-out ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}
        {/* Mist Cloud */}
        <div
          className="absolute left-[100px] top-1/2 -translate-y-1/2 w-[300px] h-[180px] z-10"
          style={{
            background: "radial-gradient(ellipse at center, rgba(52, 152, 219, 0.2) 0%, transparent 70%)",
            animation: "mistCloud 1.4s ease-out 0.2s forwards",
          }}
        />
      </div>
    </div>
  );
}

export default function Preloader({ onComplete }) {
  const [phase, setPhase] = useState("idle");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0); // Start at the top
    document.body.style.overflow = 'hidden';
    const t1 = setTimeout(() => setPhase("spray"), 800);
    const t2 = setTimeout(() => setPhase("dissolve"), 1600);
    const t3 = setTimeout(() => setPhase("fadeout"), 2000);
    const t4 = setTimeout(() => {
      setVisible(false);
      window.scrollTo(0, 0); // Reset scroll to top
      document.body.style.overflow = 'auto';
      if (onComplete) onComplete();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      document.body.style.overflow = 'auto';
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden preloader-bg"
      style={{
        transition: "background-color 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center">
        {/* Bug / Target */}
        <div
          className="absolute left-[70%] sm:left-[65%] md:left-[60%] top-1/2 z-0"
          style={{
            animation:
              phase === "dissolve" || phase === "fadeout"
                ? "bugDissolve 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                : "bugWiggle 1s ease-in-out infinite",
          }}
        >
          <BugSVG className="w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-44" />
        </div>

        {/* Spray Group (Nozzle + Particles) */}
        <div className="absolute inset-0 flex items-center justify-center group pointer-events-none">
          <SprayNozzle visible={phase === "spray" || phase === "dissolve"} />
          <SprayParticles visible={phase === "spray" || phase === "dissolve"} />
        </div>
      </div>

      {/* Brand Identity */}
      <div
        className="absolute bottom-16 text-center transition-all duration-700 w-full px-5"
        style={{ 
          opacity: phase === "fadeout" ? 0 : 1,
          transform: phase === "fadeout" ? "translateY(20px)" : "translateY(0)"
        }}
      >
        <div className="flex flex-col items-center">
          <span className="text-xl md:text-2xl font-bebas tracking-tight uppercase leading-none" style={{ color: "#7A9A3A" }}>A.B. PEST CONTROL</span>
          <span className="text-[7px] md:text-[9px] font-montserrat font-bold uppercase tracking-[0.6em] leading-none" style={{ color: "#F13A1D" }}>INSECTICIDE SERVICES</span>
        </div>
        <div className="w-24 h-px bg-linear-to-r from-transparent via-white/30 to-transparent mx-auto mt-4" />
      </div>
    </div>
  );
}
