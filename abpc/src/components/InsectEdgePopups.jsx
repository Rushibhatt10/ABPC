import { useNavigate } from "react-router-dom";

export default function InsectEdgePopups() {
  const navigate = useNavigate();

  const insects = [
    { emoji: "🐜", position: "left-3 sm:left-4 top-[30%]" },
    { emoji: "🪳", position: "right-3 sm:right-4 top-[45%]" },
    { emoji: "🦟", position: "left-3 sm:left-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)]" },
    { emoji: "🐛", position: "right-3 sm:right-4 top-[15%]" },
  ];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {insects.map((ins, i) => (
        <button
          key={i}
          onClick={() => navigate("/insects")}
          className={`absolute ${ins.position} group pointer-events-auto
          hover:scale-110 active:scale-95 transition-all duration-300`}
          style={{
            animation: `floatSoft ${4 + i}s ease-in-out infinite`,
          }}
        >
          {/* Emoji */}
          <span className="text-2xl sm:text-3xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)] group-hover:scale-125 transition-all duration-300">
            {ins.emoji}
          </span>

          {/* Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full 
          bg-white/90 backdrop-blur-md text-black shadow-xl border border-black/10
          opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 
          transition-all duration-300 whitespace-nowrap">
            Know Your Insects →
          </div>
        </button>
      ))}
    </div>
  );
}