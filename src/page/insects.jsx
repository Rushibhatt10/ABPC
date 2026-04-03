import { useState, useRef, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ThemeContext } from "../context/ThemeContext";
import gsap from "gsap";

const insects = [
  {
    emoji: "🐜",
    title: "Termites",
    image: "/te.jpg",
    accent: "rgba(139, 69, 19, 0.15)", // Deep wood brown tint
    subtitle: "Subterranean · Drywood",
    desc: "Silent destroyers causing huge structural damage. They feed on wood from the inside out.",
    signs: ["Hollow-sounding wood", "Mud tubes along walls", "Discarded wings"],
  },
  {
    emoji: "🪳",
    title: "Cockroaches",
    image: "/co.jpg",
    accent: "rgba(226, 150, 4, 0.15)", // Warm gold/orange tint
    subtitle: "German · American · Oriental",
    desc: "Fast breeders thriving in warm environments. They contaminate food and spread bacteria.",
    signs: ["Pepper-like droppings", "Musty odor in cabinets", "Egg cases near heat"],
  },
  {
    emoji: "🦟",
    title: "Mosquitoes",
    image: "/mo.jpg",
    accent: "rgba(0, 100, 0, 0.15)", // Dark forest green tint
    subtitle: "Aedes · Anopheles · Culex",
    desc: "Vectors of dengue and malaria. Breeding in tiny water sources, they multiply quickly.",
    signs: ["Biting at dawn/dusk", "Local standing water", "High activity near light"]
  },
  {
    emoji: "🐛",
    title: "Bed Bugs",
    image: "/bb.jpg",
    accent: "rgba(180, 0, 0, 0.15)", // Deep red tint
    subtitle: "Cimex lectularius",
    desc: "Expert hiders that feed on blood at night. They spread rapidly through luggage.",
    signs: ["Rusty spots on bedding", "Itchy line-pattern welts", "Sweet musty room odor"],
  },
  {
    emoji: "🐭",
    title: "Rodents",
    image: "/ra.jpg",
    accent: "rgba(75, 75, 75, 0.15)", // Steel grey tint
    subtitle: "Rats · Mice",
    desc: "Carriers of disease that chew wiring and contaminate food.",
    signs: ["Droppings leads along walls", "Gnaw marks on food", "Night-time scratching"],
  },
];

export default function InsectsPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [activeSlide, setActiveSlide] = useState(0);
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  // Swipe Support
  const handleTouchStart = (e) => (touchStart.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e) => (touchEnd.current = e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > 70) nextSlide();
    if (distance < -70) prevSlide();
    touchStart.current = 0;
    touchEnd.current = 0;
  };

  const nextSlide = () => {
    if (activeSlide < insects.length - 1 && !isScrolling) {
      setIsScrolling(true);
      setActiveSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (activeSlide > 0 && !isScrolling) {
      setIsScrolling(true);
      setActiveSlide(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, {
      x: `-${activeSlide * 100}%`,
      duration: 1.1,
      ease: "expo.inOut",
      onComplete: () => setIsScrolling(false)
    });

    // Content reveal animation
    const currentSlide = containerRef.current.children[activeSlide];
    const title = currentSlide.querySelector(".insect-title");
    const desc = currentSlide.querySelector(".insect-desc");
    
    if (title && desc) {
      gsap.fromTo([title, desc], 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", delay: 0.5 }
      );
    }
  }, [activeSlide]);

  return (
    <div 
      className={`min-h-svh h-svh w-full overflow-hidden transition-colors duration-700 relative ${isDark ? "bg-[#0a0a0a] text-[#f5f5f0]" : "bg-[#faf9f6] text-[#0c0c0c]"}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Accent Glow */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-colors duration-1000 blur-[150px] opacity-20"
        style={{ backgroundColor: insects[activeSlide].accent }} 
      />

      {/* Visual Grain Texture */}
      <div className="fixed inset-0 pointer-events-none z-100 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />

      {/* Dynamic Header (Compact) */}
      <div className={`fixed top-0 z-50 w-full px-5 md:px-12 py-4 md:py-6 flex justify-between items-center transition-all duration-500`}>
        <Link to="/" className="flex items-center gap-3 group">
          <div className={`p-2 rounded-full transition-all duration-300 ${isDark ? "bg-white/10 group-hover:bg-white text-white group-hover:text-black" : "bg-black/10 group-hover:bg-black text-black group-hover:text-white border border-black/5"}`}>
            <ArrowLeft size={16} />
          </div>
          <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-40 group-hover:opacity-100 transition-opacity">Back</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
           <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black">Archive</span>
            <span className="text-[10px] font-serif uppercase tracking-widest">{insects[activeSlide].title}</span>
          </div>
          <div className="text-right">
             <span className="text-base md:text-xl font-mono tracking-tighter tabular-nums opacity-60">
                0{activeSlide + 1} <span className="opacity-20 font-sans">/</span> 0{insects.length}
             </span>
          </div>
        </div>
      </div>

      {/* Main Slider Container (Locked Height) */}
      <div className="relative w-full h-full overflow-hidden">
        <div ref={containerRef} className="flex h-full w-full will-change-transform">
          {insects.map((ins, i) => (
            <div key={ins.title} className="w-full h-full shrink-0 relative flex flex-col lg:flex-row items-stretch overflow-hidden">
              
              {/* Top Section (Image Showcase - 40% height on mobile) */}
              <div className="h-[40svh] lg:h-auto lg:flex-1 relative overflow-hidden z-10">
                <img 
                  src={ins.image} 
                  alt={ins.title} 
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-2000 ease-out ${activeSlide === i ? "scale-105" : "scale-120"}`} 
                />
                {/* Visual Blending Overlays */}
                <div className={`absolute inset-0 bg-linear-to-b lg:bg-linear-to-r ${isDark ? "from-transparent to-[#0a0a0a] lg:from-black/60 lg:to-transparent" : "from-transparent to-[#faf9f6]/40 lg:from-white/60 lg:to-transparent theme-light-overlay"}`} />
                
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] md:opacity-[0.03] select-none pointer-events-none">
                   <span className="text-[35svh] lg:text-[20vw] font-serif uppercase leading-none tracking-tighter">{ins.emoji}</span>
                </div>
              </div>

              {/* Bottom Section (Information Card - 60% height on mobile) */}
              <div className="relative h-[60svh] lg:h-auto lg:flex-1 flex flex-col justify-start lg:justify-center px-1 md:px-12 lg:px-24 pb-20 md:pb-32 lg:py-24 z-20 overflow-hidden">
                
                <div className={`insect-card flex flex-col gap-4 md:gap-8 max-w-2xl w-full self-center lg:self-start transition-all duration-1000 delay-300 p-6 md:p-10 rounded-t-[40px] lg:rounded-[40px] border-x border-t lg:border-b backdrop-blur-3xl shadow-2xl h-full lg:h-auto overflow-hidden ${activeSlide === i ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"} ${isDark ? "bg-black/30 border-white/5" : "bg-white/60 border-black/5"}`}>
                  
                  {/* Title Area */}
                  <div className="space-y-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-5xl filter grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer pointer-events-auto shrink-0">{ins.emoji}</span>
                      <div className={`h-px w-10 md:w-16 rounded-full ${isDark ? "bg-white/30" : "bg-black/30"}`} />
                      <span className={`text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em] opacity-40`}>{ins.subtitle}</span>
                    </div>
                    <div className="overflow-visible whitespace-nowrap">
                      <h2 className="insect-title min-w-max text-[clamp(2rem,10vw,4rem)] lg:text-[clamp(3rem,8vw,5.5rem)] font-serif uppercase tracking-tighter leading-[0.8] mb-1">
                        {ins.title}
                      </h2>
                    </div>
                  </div>

                  <p className="insect-desc text-[11px] md:text-sm lg:text-base leading-relaxed opacity-70 font-sans italic max-w-lg border-l-2 border-current/20 pl-4 py-1 shrink-0">
                    {ins.desc}
                  </p>

                  {/* Details Grid (Strict Visibility Control) */}
                  <div className="flex flex-col gap-5 lg:gap-10 border-t border-current/10 pt-5 md:pt-8 overflow-hidden">
                    
                    {/* Signs */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2">
                        <Search size={14} className="opacity-40" />
                        <h4 className="text-[8px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-30">Warning Signs</h4>
                      </div>
                      <ul className="flex flex-col gap-2.5">
                        {ins.signs.map((sign) => (
                          <li key={sign} className="flex items-start gap-3 group">
                            <span className="mt-2 w-1.5 h-[1.5px] bg-red-500/60 transition-all shrink-0" />
                            <span className="text-[10px] md:text-xs lg:text-sm font-bold opacity-60 group-hover:opacity-90">{sign}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Controls (Locked Bottom) */}
      <div className={`fixed bottom-0 lg:bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center lg:gap-10 px-8 py-6 lg:rounded-3xl border-x border-t lg:border shadow-2xl transition-all duration-700 w-full lg:w-auto ${isDark ? "bg-black border-white/5 backdrop-blur-3xl" : "bg-white border-black/5 backdrop-blur-3xl"}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full gap-8">
            <button 
                onClick={prevSlide}
                disabled={activeSlide === 0 || isScrolling}
                className={`flex items-center group disabled:opacity-10 transition-all duration-300`}
            >
                <div className={`p-2.5 rounded-full transition-all duration-300 ${isDark ? "bg-white/5 group-hover:bg-white text-white group-hover:text-black" : "bg-black/5 group-hover:bg-black text-black group-hover:text-white"}`}>
                <ChevronLeft size={16} />
                </div>
            </button>

            <div className="flex gap-3">
                {insects.map((_, i) => (
                <button
                    key={i}
                    onClick={() => !isScrolling && setActiveSlide(i)}
                    className={`h-0.5 transition-all duration-700 rounded-full ${activeSlide === i ? "w-10 bg-current" : "w-1.5 bg-current/10"}`}
                />
                ))}
            </div>

            <button 
                onClick={nextSlide}
                disabled={activeSlide === insects.length - 1 || isScrolling}
                className={`flex items-center group disabled:opacity-10 transition-all duration-300`}
            >
                <div className={`p-2.5 rounded-full transition-all duration-300 ${isDark ? "bg-white/5 group-hover:bg-white text-white group-hover:text-black" : "bg-black/5 group-hover:bg-black text-black group-hover:text-white"}`}>
                <ChevronRight size={16} />
                </div>
            </button>
        </div>
      </div>

      {/* Swipe Overlay Hint (Clean) */}
      {activeSlide === 0 && (
        <div className="fixed bottom-24 lg:hidden left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-20 pointer-events-none group">
           <div className="w-8 h-px bg-current opacity-30" />
           <span className="text-[7px] uppercase tracking-[0.6em] font-black">Swipe to explore</span>
           <div className="w-8 h-px bg-current opacity-30" />
        </div>
      )}
    </div>
  );
}
