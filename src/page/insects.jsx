import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Search, X } from "lucide-react";
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
  {
    emoji: "🪵",
title: "Wood Borers",
image: "/wb.jpg",
accent: "rgba(139, 94, 60, 0.15)", // Warm wood brown tint
subtitle: "Beetles · Larvae",
desc: "Silent destroyers that tunnel through wood, weakening furniture and structures from within.",
signs: ["Tiny round exit holes in wood", "Fine powder (frass) near surfaces", "Hollow or weakened wooden structures"],
  },
];

export default function InsectsPage() {
  const SWIPE_THRESHOLD = 56;
  const SLIDE_ANIMATION_DURATION = 0.55;
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [activeSlide, setActiveSlide] = useState(0);
  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const touchGesture = useRef({ startX: 0, startY: 0, endX: 0, endY: 0 });
  const slideTweenRef = useRef(null);
  const unlockTimerRef = useRef(null);
  const isAnimatingRef = useRef(false);

  const unlockAnimation = useCallback(() => {
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    isAnimatingRef.current = false;
    setIsScrolling(false);
  }, []);

  const goToSlide = useCallback((targetIndex) => {
    if (targetIndex < 0 || targetIndex >= insects.length) return;
    if (targetIndex === activeSlide || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsScrolling(true);
    setActiveSlide(targetIndex);
  }, [activeSlide]);

  // Swipe Support
  const handleTouchStart = (e) => {
    const touch = e.targetTouches[0];
    touchGesture.current.startX = touch.clientX;
    touchGesture.current.startY = touch.clientY;
    touchGesture.current.endX = touch.clientX;
    touchGesture.current.endY = touch.clientY;
  };

  const handleTouchMove = (e) => {
    const touch = e.targetTouches[0];
    touchGesture.current.endX = touch.clientX;
    touchGesture.current.endY = touch.clientY;
  };

  const handleTouchEnd = () => {
    const { startX, startY, endX, endY } = touchGesture.current;
    const deltaX = startX - endX;
    const deltaY = startY - endY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) nextSlide();
      if (deltaX < 0) prevSlide();
    }

    touchGesture.current = { startX: 0, startY: 0, endX: 0, endY: 0 };
  };

  const nextSlide = () => {
    goToSlide(activeSlide + 1);
  };

  const prevSlide = () => {
    goToSlide(activeSlide - 1);
  };

  useEffect(() => {
    if (showIntroVideo) return;
    if (!containerRef.current) return;

    if (slideTweenRef.current) {
      slideTweenRef.current.kill();
    }

    slideTweenRef.current = gsap.to(containerRef.current, {
      xPercent: -(activeSlide * 100),
      duration: SLIDE_ANIMATION_DURATION,
      ease: "power3.out",
      force3D: true,
      overwrite: "auto",
      onComplete: unlockAnimation
    });

    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(unlockAnimation, (SLIDE_ANIMATION_DURATION * 1000) + 160);

    // Content reveal animation
    const currentSlide = containerRef.current.children[activeSlide];
    const title = currentSlide.querySelector(".insect-title");
    const desc = currentSlide.querySelector(".insect-desc");
    
    if (title && desc) {
      gsap.fromTo([title, desc], 
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power2.out", overwrite: "auto" }
      );
    }
  }, [SLIDE_ANIMATION_DURATION, activeSlide, showIntroVideo, unlockAnimation]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      if (slideTweenRef.current) slideTweenRef.current.kill();
    };
  }, []);

  const enterSlides = () => {
    setShowIntroVideo(false);
  };

  if (showIntroVideo) {
    return (
      <div className={`min-h-svh h-svh w-full overflow-hidden relative ${isDark ? "bg-[#0a0a0a] text-[#f5f5f0]" : "bg-[#faf9f6] text-[#0c0c0c]"}`}>
        <div className="fixed top-0 z-20 w-full px-4 sm:px-5 md:px-12 py-3 sm:py-4 md:py-6 flex justify-between items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className={`p-2 rounded-full transition-all duration-300 ${isDark ? "bg-white/10 group-hover:bg-white text-white group-hover:text-black" : "bg-black/10 group-hover:bg-black text-black group-hover:text-white border border-black/5"}`}>
              <ArrowLeft size={16} />
            </div>
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-40 group-hover:opacity-100 transition-opacity">Back</span>
          </Link>
          <button
            type="button"
            onClick={enterSlides}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-300 border whitespace-nowrap ${isDark ? "bg-white/10 border-white/20 hover:bg-white hover:text-black" : "bg-black/5 border-black/20 hover:bg-black hover:text-white"}`}
          >
            <span className="hidden sm:inline">Skip To Slides</span>
            <span className="sm:hidden">Skip</span>
          </button>
        </div>

        <div className="h-full w-full flex items-center justify-center px-3 sm:px-8 pt-16 sm:pt-20 pb-4 sm:pb-6">
          <div className={`w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden border shadow-2xl ${isDark ? "bg-[#111] border-white/10" : "bg-white border-black/10"}`}>
            <video
              src="/ab.mp4"
              controls
              playsInline
              preload="metadata"
              onEnded={enterSlides}
              className="w-full h-[56svh] sm:max-h-[74svh] sm:h-auto bg-black object-contain"
            />

            <div className={`px-4 sm:px-5 py-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isDark ? "border-white/10" : "border-black/10"}`}>
              <div className="min-w-0">
                <p className="text-[11px] md:text-sm uppercase tracking-[0.2em] font-black opacity-60">Watch First</p>
                <p className="text-sm md:text-base mt-1 opacity-85">Co-founder <span className="font-semibold">Ankit Bhatt</span> explains insect behavior and prevention.</p>
              </div>
              <button
                type="button"
                onClick={enterSlides}
                className={`w-full sm:w-auto shrink-0 px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-300 border ${isDark ? "bg-white/10 border-white/20 hover:bg-white hover:text-black" : "bg-black/5 border-black/20 hover:bg-black hover:text-white"}`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-svh h-svh w-full overflow-hidden transition-colors duration-700 relative touch-pan-y ${isDark ? "bg-[#0a0a0a] text-[#f5f5f0]" : "bg-[#faf9f6] text-[#0c0c0c]"}`}
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
      <div className={`fixed top-0 z-50 w-full px-3 sm:px-5 md:px-12 py-3 sm:py-4 md:py-6 flex justify-between items-center transition-all duration-500 gap-2`}>
        <Link to="/" className="flex items-center gap-3 group">
          <div className={`p-2 rounded-full transition-all duration-300 ${isDark ? "bg-white/10 group-hover:bg-white text-white group-hover:text-black" : "bg-black/10 group-hover:bg-black text-black group-hover:text-white border border-black/5"}`}>
            <ArrowLeft size={16} />
          </div>
          <span className="hidden sm:inline text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-40 group-hover:opacity-100 transition-opacity">Back</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          <button
            type="button"
            onClick={() => setIsVideoOpen(true)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-[8px] sm:text-[9px] uppercase tracking-[0.2em] font-black transition-all duration-300 whitespace-nowrap ${isDark ? "border-white/20 bg-white/5 hover:bg-white hover:text-black" : "border-black/20 bg-black/5 hover:bg-black hover:text-white"}`}
          >
            <Play size={11} />
            <span className="hidden sm:inline">Ankit's Insect Guide</span>
            <span className="sm:hidden">Video</span>
          </button>
           <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black">Archive</span>
            <span className="text-[10px] font-serif uppercase tracking-widest">{insects[activeSlide].title}</span>
          </div>
          <div className="text-right">
             <span className="hidden sm:inline text-base md:text-xl font-mono tracking-tighter tabular-nums opacity-60">
                0{activeSlide + 1} <span className="opacity-20 font-sans">/</span> 0{insects.length}
             </span>
             <span className="sm:hidden text-xs font-mono tracking-tight tabular-nums opacity-70">
                {activeSlide + 1}/{insects.length}
             </span>
          </div>
        </div>
      </div>

      {/* Main Slider Container (Locked Height) */}
      <div className="relative w-full h-full overflow-hidden">
        <div ref={containerRef} className="flex h-full w-full will-change-transform transform-gpu">
          {insects.map((ins, i) => (
            <div key={ins.title} className="w-full h-full shrink-0 relative flex flex-col lg:flex-row items-stretch overflow-hidden">
              
              {/* Top Section (Image Showcase - 40% height on mobile) */}
              <div className="h-[38svh] sm:h-[40svh] lg:h-auto lg:flex-1 relative overflow-hidden z-10">
                <img 
                  src={ins.image} 
                  alt={ins.title} 
                  className={`absolute inset-0 w-full h-full object-cover transform-gpu transition-transform duration-700 ease-out ${activeSlide === i ? "scale-105" : "scale-100"}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                {/* Visual Blending Overlays */}
                <div className={`absolute inset-0 bg-linear-to-b lg:bg-linear-to-r ${isDark ? "from-transparent to-[#0a0a0a] lg:from-black/60 lg:to-transparent" : "from-transparent to-[#faf9f6]/40 lg:from-white/60 lg:to-transparent theme-light-overlay"}`} />
                
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] md:opacity-[0.03] select-none pointer-events-none">
                   <span className="text-[35svh] lg:text-[20vw] font-serif uppercase leading-none tracking-tighter">{ins.emoji}</span>
                </div>
              </div>

              {/* Bottom Section (Information Card - 60% height on mobile) */}
              <div className="relative h-[62svh] sm:h-[60svh] lg:h-auto lg:flex-1 flex flex-col justify-start lg:justify-center px-1 md:px-12 lg:px-24 pb-24 sm:pb-20 md:pb-32 lg:py-24 z-20 overflow-y-auto lg:overflow-hidden">
                
                <div className={`insect-card flex flex-col gap-4 md:gap-8 max-w-2xl w-full self-center lg:self-start transition-[opacity,transform] duration-500 p-4 sm:p-6 md:p-10 rounded-t-[28px] sm:rounded-t-[40px] lg:rounded-[40px] border-x border-t lg:border-b backdrop-blur-lg md:backdrop-blur-xl shadow-2xl h-full lg:h-auto overflow-hidden ${activeSlide === i ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${isDark ? "bg-black/30 border-white/5" : "bg-white/60 border-black/5"}`}>
                  
                  {/* Title Area */}
                  <div className="space-y-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-5xl filter grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer pointer-events-auto shrink-0">{ins.emoji}</span>
                      <div className={`h-px w-10 md:w-16 rounded-full ${isDark ? "bg-white/30" : "bg-black/30"}`} />
                      <span className={`text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em] opacity-40`}>{ins.subtitle}</span>
                    </div>
                    <div className="overflow-visible whitespace-normal md:whitespace-nowrap">
                      <h2 className="insect-title md:min-w-max text-[clamp(1.9rem,9vw,4rem)] lg:text-[clamp(3rem,8vw,5.5rem)] font-serif uppercase tracking-tighter leading-[0.86] mb-1">
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
      <div className={`fixed bottom-0 lg:bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center lg:gap-10 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6 lg:rounded-3xl border-x border-t lg:border shadow-2xl transition-all duration-500 w-full sm:w-[92%] lg:w-auto ${isDark ? "bg-black border-white/5 backdrop-blur-md lg:backdrop-blur-3xl" : "bg-white border-black/5 backdrop-blur-md lg:backdrop-blur-3xl"}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full gap-4 sm:gap-8">
            <button 
                onClick={prevSlide}
                disabled={activeSlide === 0 || isScrolling}
                className={`flex items-center group disabled:opacity-10 transition-all duration-300`}
            >
                <div className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 ${isDark ? "bg-white/5 group-hover:bg-white text-white group-hover:text-black" : "bg-black/5 group-hover:bg-black text-black group-hover:text-white"}`}>
                <ChevronLeft size={14} />
                </div>
            </button>

            <div className="flex gap-2 sm:gap-3">
                {insects.map((_, i) => (
                <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-0.5 transition-all duration-700 rounded-full ${activeSlide === i ? "w-7 sm:w-10 bg-current" : "w-1.5 bg-current/10"}`}
                />
                ))}
            </div>

            <button 
                onClick={nextSlide}
                disabled={activeSlide === insects.length - 1 || isScrolling}
                className={`flex items-center group disabled:opacity-10 transition-all duration-300`}
            >
                <div className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 ${isDark ? "bg-white/5 group-hover:bg-white text-white group-hover:text-black" : "bg-black/5 group-hover:bg-black text-black group-hover:text-white"}`}>
                <ChevronRight size={14} />
                </div>
            </button>
        </div>
      </div>

      {isVideoOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center"
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className={`relative w-full max-w-4xl rounded-3xl overflow-hidden border shadow-2xl ${isDark ? "bg-[#111] border-white/10" : "bg-white border-black/10"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-colors ${isDark ? "bg-white/15 text-white hover:bg-white hover:text-black" : "bg-black/10 text-black hover:bg-black hover:text-white"}`}
              aria-label="Close video"
            >
              <X size={16} />
            </button>

            <video
              src="/ab.mp4"
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[70svh] bg-black object-contain"
            />

            <div className={`px-5 py-4 border-t ${isDark ? "border-white/10" : "border-black/10"}`}>
              <p className="text-[11px] md:text-sm uppercase tracking-[0.2em] font-black opacity-60">Expert Session</p>
              <p className="text-sm md:text-base mt-1 opacity-85">
                Co-founder <span className="font-semibold">Ankit Bhatt</span> shares practical knowledge about insect behavior and prevention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Overlay Hint (Clean) */}
      {activeSlide === 0 && (
        <div className="fixed bottom-20 lg:hidden left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-20 pointer-events-none group">
           <div className="w-8 h-px bg-current opacity-30" />
           <span className="text-[7px] uppercase tracking-[0.6em] font-black">Swipe to explore</span>
           <div className="w-8 h-px bg-current opacity-30" />
        </div>
      )}
    </div>
  );
}
