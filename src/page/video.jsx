import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeContext } from '../context/theme-context';

export default function VideoPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  return (
    <div className={`min-h-[100dvh] pb-[env(safe-area-inset-bottom)] flex flex-col justify-center items-center w-full relative transition-colors duration-700 ${isDark ? "bg-[#0a0a0a] text-[#f5f5f0]" : "bg-[#faf9f6] text-[#0c0c0c]"}`}>
      <div className="fixed top-0 z-20 w-full px-4 sm:px-5 md:px-12 pt-[calc(env(safe-area-inset-top)+0.55rem)] pb-3 sm:pt-[calc(env(safe-area-inset-top)+0.8rem)] sm:pb-4 md:py-6 flex justify-between items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-3 group">
          <div className={`p-2 rounded-full transition-all duration-300 ${isDark ? "bg-white/10 group-hover:bg-white text-white group-hover:text-black" : "bg-black/10 group-hover:bg-black text-black group-hover:text-white border border-black/5"}`}>
            <ArrowLeft size={16} />
          </div>
          <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] opacity-40 group-hover:opacity-100 transition-opacity">Back</span>
        </button>
      </div>

      <div className="w-full max-w-5xl px-3 sm:px-8 mt-[calc(4rem+env(safe-area-inset-top))] sm:mt-[calc(5rem+env(safe-area-inset-top))] mb-6 relative z-10">
        <div className={`w-full rounded-2xl sm:rounded-3xl overflow-hidden border shadow-2xl ${isDark ? "bg-[#111] border-white/10" : "bg-white border-black/10"}`}>
          <video
            src="/ab.mp4"
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[68dvh] sm:max-h-[74svh] bg-black object-contain"
            autoPlay
          />

          <div className={`px-4 sm:px-5 py-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isDark ? "border-white/10" : "border-black/10"}`}>
            <div className="min-w-0">
              <p className="text-[11px] md:text-sm uppercase tracking-[0.2em] font-medium opacity-60">Expert Session</p>
              <p className="text-sm md:text-base mt-1 opacity-85">Co-founder <span className="font-medium">Ankit Bhatt</span> explains insect behavior and prevention.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative grain and accent similar to insects page */}
      <div className="fixed inset-0 pointer-events-none z-[40] opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />
    </div>
  );
}
