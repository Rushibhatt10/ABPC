import { useRef, useState, useEffect, useContext, useCallback } from 'react';

import { CheckCircle2 } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext.jsx';

const premiumServicesData = [
 {
 id: '01',
 title: 'Complete Anti-Termite Solutions',
 category: 'Termite Protection Services',
 points: [
 'Pre-construction soil treatment',
 'Plinth level protection',
 'Before flooring chemical barrier',
 'Injection (drilling) treatment for existing buildings',
 'Wooden furniture protection',
 'Pipe system for future termite control'
 ],
 video: 'Video.mp4'
 },
 {
 id: '02',
 title: 'Environment Protection Treatments',
 category: 'Health & Outdoor Pest Control',
 points: [
 'Rat & mouse control solutions',
 'Garden pest protection',
 'General insect spray service',
 'Mosquito Control Program',
 'Indoor residual spray',
 'Power fogging for open areas',
 'Anti-breeding larva treatment'
 ],
 video: 'Video2.mp4'
 },
 {
   id: '04',
 title: 'Daily Pest Problems Solved',
 category: 'Home & Office Pest Control',
 points: [
 'Cockroach spray & gel treatment',
 'Ant nest removal service',
 'Bedbug complete elimination',
 'Wooden furniture protection',
 'Safe for family and pets'
 ],
 video: 'coc.mp4'
 },
 {
 id: '04',
 title: 'Protection Without Chemicals',
 category: 'Nets & Safety Installations',
 points: [
 'Mosquito safety nets for windows',
 'Invisible balcony safety grills',
 'Bird protection nets',
 'Anti-bird spike installation'
 ],
 video: 'wc.mp4'
 },
 {
 id: '05',
 title: 'A Legacy of Trust & Excellence',
 category: 'Why Choose Us',
 points: [
 'Skilled & trained technicians',
 'Government-approved chemicals',
 'Modern equipment used',
 'Flexible service timing',
 'Free inspection available'
 ],
 video: 'ABAB.mp4'
 }
];

const PremiumServices = () => {
 const scrollRef = useRef(null);
 const videoRefs = useRef([]);
 const [activeIndex, setActiveIndex] = useState(0);
 const { theme } = useContext(ThemeContext);
 const isDark = theme === 'dark';

 const handleScroll = useCallback(() => {
 if (!scrollRef.current) return;
 const container = scrollRef.current;
 const maxScroll = container.scrollWidth - container.clientWidth;
 if (maxScroll <= 0) return;

 const progress = Math.min(1, Math.max(0, container.scrollLeft / maxScroll));
 const index = Math.round(progress * (premiumServicesData.length - 1));
 setActiveIndex((prev) => (prev === index ? prev : index));
 }, []);

 useEffect(() => {
 const el = scrollRef.current;
 if (!el) return undefined;

 el.addEventListener('scroll', handleScroll, { passive: true });
 return () => el.removeEventListener('scroll', handleScroll);
 }, [handleScroll]);

 useEffect(() => {
 videoRefs.current.forEach((video, idx) => {
 if (!video) return;
 if (idx === activeIndex) {
 const playPromise = video.play();
 if (playPromise && typeof playPromise.catch === 'function') {
 playPromise.catch(() => {});
 }
 } else {
 video.pause();
 }
 });
 }, [activeIndex]);

 return (
 <section
 id="services"
 className={`w-full py-14 sm:py-16 md:py-32 overflow-hidden relative transition-colors duration-700 ${
 isDark ? 'bg-[#0a0a0a] text-[#f0ede8]' : 'bg-[#f7f5f0] text-[#111110]'
 }`}
 >
 <div
 className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] blur-[160px] rounded-full pointer-events-none ${
 isDark ? 'bg-[#95B15F]/6' : 'bg-[#95B15F]/4'
 }`}
 />

 <div className="max-w-[1440px] mx-auto px-4 sm:px-5 md:px-14 relative z-10">
 <div className="mb-10 sm:mb-12 md:mb-20 flex flex-col items-center text-center">
 <span className="text-[#95B15F] text-sm md:text-base uppercase tracking-[0.3em] opacity-80 mb-4 block">
 Our Services
 </span>

 

 <div className={`hidden md:flex items-center gap-3 mt-4 ${isDark ? 'text-white/30' : 'text-black/30'}`}>
 <span className="text-[10px] uppercase tracking-widest font-medium">
 Drag to explore
 </span>
 <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
 </svg>
 </div>
 </div>
 </div>

 <style dangerouslySetInnerHTML={{ __html: '.ps-track::-webkit-scrollbar { display: none; }' }} />
 <div
 ref={scrollRef}
 className="ps-track flex gap-4 sm:gap-5 md:gap-7 overflow-x-auto snap-x snap-mandatory pb-6 md:pb-10 pt-1 md:pt-2 pr-2 sm:pr-0 select-none overscroll-x-contain"
 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
 >
 {premiumServicesData.map((service, idx) => {
 const isActive = activeIndex === idx;
 return (
 <div
 key={service.id}
 className={`snap-center shrink-0 w-[94vw] sm:w-[90vw] md:w-[820px] lg:w-[980px] min-h-0 md:min-h-[520px] max-h-none md:max-h-[72vh] relative group rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col md:flex-row transition-all duration-700 ${
 isDark
 ? 'bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
 : 'bg-[#ffffff] shadow-[0_20px_60px_rgba(0,0,0,0.08)]'
 } ${isActive ? 'ring-1 ring-[#95B15F]/30' : ''}`}
 >
 <div className="w-full md:w-[48%] aspect-5/4 sm:aspect-4/3 md:aspect-auto md:h-auto relative overflow-hidden shrink-0">
 {service.video ? (
 <video
 ref={(el) => {
 videoRefs.current[idx] = el;
 }}
 src={service.video}
 muted
 loop
 playsInline
 preload="metadata"
 className="w-full h-full object-cover pointer-events-none"
 />
 ) : (
 <img
 src={service.image}
 alt={service.category}
 className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-[8s] ease-out pointer-events-none"
 loading="lazy"
 />
 )}
 <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent md:bg-linear-to-r md:from-transparent md:via-transparent md:to-black/20 pointer-events-none" />
 <span
 className="absolute top-4 sm:top-5 left-4 sm:left-5 text-white/60 text-4xl sm:text-5xl leading-none z-10"
 >
 {service.id}
 </span>
 </div>

 <div
 className={`w-full md:w-[52%] px-5 sm:px-6 py-5 sm:py-6 md:px-12 md:py-14 flex flex-col justify-center transition-opacity duration-700 ${
 isActive ? 'opacity-100' : 'opacity-55 md:opacity-100'
 }`}
 >
 <span
 className="text-[#95B15F] text-[8px] sm:text-[9px] md:text-[10px] font-medium uppercase mb-4 sm:mb-5 block"
 >
 {service.category}
 </span>

 <h3
 className={`text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] leading-[1.1] mb-6 md:mb-8 ${
 isDark ? 'text-[#f0ede8]' : 'text-[#111110]'
 }`}
 >
 {service.title}
 </h3>

 <div className={`w-10 h-px mb-6 md:mb-8 ${isDark ? 'bg-white/15' : 'bg-black/12'}`} />

 <ul className="space-y-3 md:space-y-4">
 {service.points.map((point, i) => (
 <li key={i} className={`flex items-start gap-3 ${isDark ? 'text-white/55' : 'text-black/55'}`}>
 <CheckCircle2 size={16} className="text-[#95B15F] shrink-0 mt-3px" />
 <span
 className="text-[13px] sm:text-sm md:text-[0.9rem] leading-relaxed tracking-wide"
 >
 {point}
 </span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 );
 })}
 </div>

 <div className="md:hidden mt-1 flex items-center justify-between">
 <span className={`text-[10px] uppercase tracking-[0.24em] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
 Swipe Cards
 </span>
 <span className={`text-xs tabular-nums ${isDark ? 'text-white/55' : 'text-black/55'}`}>
 {String(activeIndex + 1).padStart(2, '0')} / {String(premiumServicesData.length).padStart(2, '0')}
 </span>
 </div>
 </section>
 );
};

export default PremiumServices;
