import { useState, useEffect, useRef, useContext } from"react";
import { Link, useNavigate } from"react-router-dom";
import { Phone, Sun, Moon, ArrowRight, X, Mail, MapPin, Star, Navigation, Bookmark, Clock } from"lucide-react";
import { ThemeContext } from"../context/theme-context";
import gsap from"gsap";
import { ScrollTrigger } from"gsap/ScrollTrigger";
import Lenis from"lenis";
import Logo from"../components/Logo.jsx";
import PremiumServices from"../components/PremiumServices.jsx";

gsap.registerPlugin(ScrollTrigger);

const HamburgerIcon = ({ open }) => (
 <div className="flex flex-col justify-center items-end gap-1.5 w-6.5 h-6 cursor-pointer group">
 <span className={`block h-0.5 bg-current transition-all duration-400 ease-in-out origin-center rounded-full ${open ?"w-full rotate-45 translate-y-2" :"w-full group-hover:w-4"}`} />
 <span className={`block h-0.5 bg-current transition-all duration-400 ease-in-out rounded-full ${open ?"opacity-0 scale-x-0 w-full" :"w-5 group-hover:w-full"}`} />
 <span className={`block h-0.5 bg-current transition-all duration-400 ease-in-out origin-center rounded-full ${open ?"w-full -rotate-45 -translate-y-2" :"w-3 group-hover:w-5"}`} />
 </div>
);

const LandingPage = () => {
 const navigate = useNavigate();
 const [menuOpen, setMenuOpen] = useState(false);
 const [showAnkitPopup, setShowAnkitPopup] = useState(false);

 const { theme, toggleTheme } = useContext(ThemeContext);
 const isDark = theme === 'dark';

 const lScroll = useRef(null);
 const heroRef = useRef(null);
 const titleRefs = useRef([]);
 const textRefs = useRef([]);
 const parallaxImages = useRef([]);

 // Lenis Smooth Scroll
 useEffect(() => {
 const lenis = new Lenis({
 duration: 1.5,
 easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
 smooth: true,
 mouseMultiplier: 1.2,
 });
 lScroll.current = lenis;
 function raf(time) {
 if (lenis) lenis.raf(time);
 requestAnimationFrame(raf);
 }
 const rafId = requestAnimationFrame(raf);
 return () => {
 cancelAnimationFrame(rafId);
 lenis.destroy();
 };
 }, []);

useEffect(() => {
 let popupTimer;
 try {
 const hasSeenPopup = localStorage.getItem('abpc_ankit_popup_seen');
 if (hasSeenPopup === '1') return undefined;

 popupTimer = setTimeout(() => setShowAnkitPopup(true), 1200);
 } catch {
 popupTimer = setTimeout(() => setShowAnkitPopup(true), 0);
 }

 return () => {
 if (popupTimer) clearTimeout(popupTimer);
 };
 }, []);

 // GSAP Animations
 useEffect(() => {
 titleRefs.current = titleRefs.current.filter((el) => el && el.isConnected);
 textRefs.current = textRefs.current.filter((el) => el && el.isConnected);
 parallaxImages.current = parallaxImages.current.filter((el) => el && el.isConnected);

 let refreshTimer;
 const ctx = gsap.context(() => {
 titleRefs.current.forEach((el) => {
 if (!el) return;
 gsap.fromTo(el,
 { y: 60, opacity: 0 },
 { y: 0, opacity: 1, duration: 1.1, ease:"power3.out",
 scrollTrigger: { trigger: el, start:"top 90%", toggleActions:"play none none reverse" }
 }
 );
 });
 textRefs.current.forEach((el) => {
 if (!el) return;
 gsap.fromTo(el,
 { y: 40, opacity: 0 },
 { y: 0, opacity: 1, duration: 1.2, ease:"power2.out",
 scrollTrigger: { trigger: el, start:"top 85%", toggleActions:"play none none reverse" }
 }
 );
 });
 refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 100);
 }, heroRef);

 return () => {
 clearTimeout(refreshTimer);
 ctx.revert();
 };
 }, []);

 const handleMagneticMove = (e) => {
 const btn = e.currentTarget;
 const rect = btn.getBoundingClientRect();
 gsap.to(btn, { x: (e.clientX - rect.left - rect.width / 2) * 0.3, y: (e.clientY - rect.top - rect.height / 2) * 0.3, duration: 0.4, ease:"power2.out" });
 };
 const handleMagneticLeave = (e) => {
 gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.7, ease:"elastic.out(1, 0.3)" });
 };



 const scrollTo = (id) => {
 const el = document.getElementById(id);
 if (lScroll.current && el) lScroll.current.scrollTo(el);
 setMenuOpen(false);
 };

 const navLinks = [
 { label:"Services", id:"services" },
 { label:"About", id:"about" },
 { label:"Contact", id:"contact" },
 { label:"Know Your Insects", url:"/insects" },
 { label:"Video", url:"/video" },
 { label:"Location", id:"location" },
 ];


 const stats = [
 { value:"10,000+", label:"Recedential/Commercial/Industrial Clients", color:"text-current" },
 { value:"50+", label:"Years Experience & Building Trust", color:"text-current" },
 ];

 const dismissAnkitPopup = () => {
 setShowAnkitPopup(false);
 try {
 localStorage.setItem('abpc_ankit_popup_seen', '1');
 } catch {
 // ignore storage errors
 }
 };

 const openAnkitVideo = () => {
 dismissAnkitPopup();
 navigate('/video');
 };

 return (
 <div className={`min-h-dvh w-full overflow-x-hidden safe-bottom-pad transition-colors duration-700 ${isDark ?"bg-[#0c0c0c] text-[#f5f5f0]" :"bg-[#faf9f6] text-[#0c0c0c]"}`}>
 {showAnkitPopup && (
 <div
 className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
 onClick={dismissAnkitPopup}
 >
 <div
 className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-6 ${isDark ?"bg-[#101010] border-white/10 text-white" :"bg-white border-black/10 text-black"}`}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-[10px] uppercase tracking-[0.26em] opacity-50">Message From</p>
 <h3 className="text-xl sm:text-2xl mt-1">Co-founder Ankit Bhatt</h3>
 </div>
 <button
 type="button"
 onClick={dismissAnkitPopup}
 className={`p-2 rounded-full transition-colors ${isDark ?"bg-white/10 hover:bg-white hover:text-black" :"bg-black/5 hover:bg-black hover:text-white"}`}
 aria-label="Close popup"
 >
 <X size={16} />
 </button>
 </div>

 <p className="mt-3 text-sm sm:text-base leading-relaxed opacity-80">
 Learn directly from Ankit Bhatt about common insects, warning signs, and prevention tips.
 </p>

 <div className="mt-5 flex gap-3">
 <button
 type="button"
 onClick={openAnkitVideo}
 className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-medium transition-all ${isDark ?"bg-white text-black hover:bg-white/85" :"bg-black text-white hover:bg-black/85"}`}
 >
 Watch Message
 <ArrowRight size={14} />
 </button>
 <button
 type="button"
 onClick={dismissAnkitPopup}
 className={`px-4 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-medium border transition-all ${isDark ?"border-white/20 bg-white/5 hover:bg-white/12" :"border-black/15 bg-black/5 hover:bg-black/10"}`}
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ===== NAV ===== */}
 <nav className={`fixed top-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 md:px-8 lg:px-12 pt-[calc(env(safe-area-inset-top)+0.65rem)] pb-3 md:pt-[calc(env(safe-area-inset-top)+0.9rem)] md:pb-4 transition-colors duration-700 ${isDark ?"bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/5" :"bg-[#faf9f6]/80 backdrop-blur-xl border-b border-black/5"}`}>
 {/* Logo */}
 <div className="flex items-center gap-3">
 <Link to="/" className="z-50 relative hover:scale-105 transition-transform duration-300 origin-left">
 <Logo variant="horizontal" className="w-148px min-[370px]:w-170px sm:w-220px" />
 </Link>
 </div>
 
 {/* Desktop Nav Links */}
 <div className="hidden lg:flex items-center gap-4 lg:gap-5 xl:gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
 {navLinks.map((link) => (
 <button
 key={link.label}
 onClick={() => {
 if (link.url) navigate(link.url);
 else scrollTo(link.id);
 }}
 className={`text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 relative group overflow-hidden ${isDark ?"text-white/60 hover:text-white" :"text-black/60 hover:text-black"}`}
 >
 {link.label}
 <span className="absolute left-0 bottom-0 w-full h-0.5 bg-current transform -translate-x-full group-hover:translate-x-0 transition-transform duration-400 ease-out"></span>
 </button>
 ))}
 </div>

 {/* Right Controls */}
 <div className="flex items-center gap-3 md:gap-4 z-50 relative">
 <button
 onClick={toggleTheme}
 className={`p-2.5 rounded-full shadow-sm transition-all duration-300 hover:rotate-90 hover:scale-110 ${isDark ?"bg-white/10 text-white hover:bg-white/20" :"bg-black/5 text-black hover:bg-black/10"}`}
 aria-label="Toggle theme"
 >
 {isDark ? <Sun size={18} /> : <Moon size={18} />}
 </button>

 {/* Hamburger (Mobile/Tablet Only) */}
 <button
 onClick={() => setMenuOpen(!menuOpen)}
 className={`p-2.5 rounded-full shadow-sm transition-all duration-300 hover:scale-105 lg:hidden ${menuOpen ?"opacity-0 pointer-events-none" :"opacity-100 pointer-events-auto"} ${isDark ?"bg-white/10 text-white hover:bg-white/20" :"bg-black/5 text-black hover:bg-black/10"}`}
 aria-label="Toggle menu"
 >
 <HamburgerIcon open={menuOpen} />
 </button>
 </div>

 {/* Modern Fullscreen Overlay Menu */}
 <div
 className={`fixed inset-0 z-60 flex transition-all duration-500 ${menuOpen ?"opacity-100 pointer-events-auto" :"opacity-0 pointer-events-none"} ${isDark ?"bg-[#0c0c0c]" :"bg-[#faf9f6]"}`}
  onClick={(e) => { if (e.currentTarget === e.target) setMenuOpen(false); }}
 >
 <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 lg:hidden z-50">
 <button
 onClick={() => setMenuOpen(false)}
 className={`p-3 rounded-full shadow-sm transition-all duration-300 ${isDark ?"bg-white/10 text-white hover:bg-white/20" :"bg-black/5 text-black hover:bg-black/10"}`}
 aria-label="Close menu"
 >
 <X size={22} />
 </button>
 </div>
 {/* Left decorative panel */}
 <div
 className={`hidden md:flex flex-col justify-between w-64 lg:w-80 shrink-0 p-8 md:p-10 border-r transition-transform duration-500 ${menuOpen ?"translate-x-0" :"-translate-x-full"} ${isDark ?"border-white/10 bg-[#111]" :"border-black/8 bg-white"}`}
 >
 <div className="mb-4">
 <Logo variant="horizontal" className="scale-90 origin-left" />
 </div>
 <p className={`text-xs uppercase tracking-[0.25em] opacity-40 leading-relaxed`}>AB Pest Control<br />Est. 1990 Â· Surat, Gujarat</p>
 <div className="flex flex-col gap-3">
 <p className={`text-[10px] uppercase tracking-[0.25em] opacity-30 mb-1`}>Contact</p>
 <a href="tel:+919374488004" className="text-sm opacity-50 hover:opacity-100 transition-opacity">+91 93744 88004</a>
 <a href="mailto:abpestcontrol@gmail.com" className="text-sm opacity-50 hover:opacity-100 transition-opacity">abpestcontrol@gmail.com</a>
 <a href="https://wa.me/919374488004" target="_blank" rel="noreferrer" className="text-sm opacity-50 hover:opacity-100 transition-opacity">WhatsApp</a>
 </div>
 </div>

 {/* Main nav links */}
 <div className="flex-1 w-full h-dvh overflow-y-auto flex flex-col justify-start md:justify-center px-6 md:px-16 lg:px-24 pt-28 sm:pt-32 md:pt-0 pb-[calc(3rem+env(safe-area-inset-bottom))] md:pb-12">
 <div className="flex flex-col gap-1 w-full mt-4 md:mt-0">
 {navLinks.map((link, i) => (
 <button
 key={link.label}
 onClick={() => {
 if (link.url) { navigate(link.url); setMenuOpen(false); }
 else scrollTo(link.id);
 }}
 className={`group flex items-center justify-between w-full py-4 md:py-5 border-b text-left transition-all duration-300
 ${ isDark ?"border-white/8 hover:border-white/30" :"border-black/6 hover:border-black/20"}`}
 style={{ transitionDelay: menuOpen ? `${i * 50 + 80}ms` :"0ms",
 transform: menuOpen ?"translateX(0)" :"translateX(-20px)",
 opacity: menuOpen ? 1 : 0 }}
 >
 <div className="flex items-center gap-4 md:gap-6">
 <span className={`text-[10px] opacity-30 w-5`}>0{i + 1}</span>
 <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl uppercase tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
 {link.label}
 </span>
 </div>
 <span className={`text-xl opacity-0 group-hover:opacity-40 transition-all duration-300 -translate-x-2 group-hover:translate-x-0`}>â†’</span>
 </button>
 ))}
 </div>
 </div>

 {/* Toggle Button inside Menu */}
 <button
 onClick={() => setMenuOpen(!menuOpen)}
 className={`absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-4 md:top-[calc(env(safe-area-inset-top)+1rem)] md:right-8 lg:right-12 p-2.5 rounded-full shadow-sm transition-all duration-300 hover:scale-105 z-50 ${isDark ?"bg-[#222] text-white border border-white/10" :"bg-white text-black border border-black/10"}`}
 aria-label="Toggle menu"
 >
 <HamburgerIcon open={menuOpen} />
 </button>
 </div>
 </nav>

 <main className={`transition-all duration-500 ease-in-out ${menuOpen ? "blur-xl scale-[0.98] brightness-75 pointer-events-none" : "blur-0 scale-100 brightness-100"}`}>
 {/* ===== HERO ===== */}
 <section ref={heroRef} className="relative w-full min-h-screen flex flex-col justify-center items-center px-5 md:px-12 pt-28 md:pt-32 pb-16 md:pb-24 overflow-hidden">
 {/* Decorative background */}
 <div className={`absolute inset-0 opacity-[0.03] pointer-events-none`}
 style={{ backgroundImage:"radial-gradient(circle at 20% 50%, #e85535 0%, transparent 60%), radial-gradient(circle at 80% 30%, #8db34b 0%, transparent 60%)" }} />

 <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center gap-6 md:gap-10">
 <span className="text-xs uppercase tracking-[0.35em] opacity-50 font-medium">Est. 1976 · Surat, Gujarat</span>
 <h1
 ref={el => el && !titleRefs.current.includes(el) && titleRefs.current.push(el)}
 className="uppercase leading-tight text-[clamp(2rem,8vw,5rem)] max-w-4xl"
 >
 GET COMPLETE SOLUTIONS
 </h1>
 <span className="text-xs uppercase tracking-[0.35em] opacity-50 font-large">RECEDENTIAL/COMMERCIAL/INDUSTRIAL</span>
 <p
 ref={el => el && !textRefs.current.includes(el) && textRefs.current.push(el)}
 className="text-base md:text-xl opacity-70 leading-relaxed max-w-2xl"
 >
 Protect your home/business/industry places with professional, eco-friendly pest control services tailored for every space from kitchens to warehouses.
 </p>
 </div>
 </section>

 {/* ===== SERVICES ===== */}
 <PremiumServices />

 {/* ===== ABOUT ===== */}
 <section id="about" className="w-full py-16 md:py-28 px-5 md:px-12">
 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col lg:flex-row gap-12 md:gap-16 items-center justify-between">
 
 {/* Left Image Holder (Bakul Bhatt) */}
 <div className="flex flex-col items-center gap-4 shrink-0 lg:w-1/4">
 <div className={`w-48 h-48 md:w-56 md:h-56 xl:w-64 xl:h-64 rounded-full overflow-hidden border border-current/10 shadow-xl group relative ${isDark ?"bg-[#111]" :"bg-gray-100"}`}>
 <img src="/bakul_bhatt.jpg" alt="Bakul Bhatt - Founder" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => { e.target.src = isDark ?"https://ui-avatars.com/api/?name=Bakul+Bhatt&background=222&color=fff&size=256" :"https://ui-avatars.com/api/?name=Bakul+Bhatt&background=ddd&color=000&size=256"; }} />
 </div>
 <div className="text-center">
 <h3 className="text-xl uppercase tracking-widest">Bakul Bhatt</h3>
 <p className="text-xs opacity-60 uppercase tracking-widest mt-1">Founder</p>
 </div>
 </div>

 {/* Center Content */}
 <div className="flex-1 flex flex-col items-center text-center max-w-2xl">
 <span className="text-[#95B15F] text-sm md:text-base uppercase tracking-[0.3em] opacity-80 mb-4 block">About Us</span>
 <h2
 ref={el => el && !titleRefs.current.includes(el) && titleRefs.current.push(el)}
 className="text-3xl sm:text-4xl md:text-5xl uppercase leading-tight mb-6 md:mb-8"
 >
 A Legacy of Trust.
 </h2>
 <div 
 ref={el => el && !textRefs.current.includes(el) && textRefs.current.push(el)}
 className="flex flex-col gap-4 text-base leading-relaxed opacity-85 mb-8 text-left w-full"
 >
 <p>
 <strong>A.B. Pest Control Insecticide Services</strong> is a trusted pest management company based in Surat, serving clients across India since <strong>1976</strong>.
 </p>
 <p>
 We specialize in effective treatments for <strong>termites, bed bugs, cockroaches, and general pest control</strong>, delivering long-term protection not just temporary solutions.
 </p>
 <p>
 Our approach is <strong>science-driven</strong>, focusing on pest behavior and root causes. With a <strong>trained team</strong> and eco-safe methods under <strong>Integrated Pest Management (IPM)</strong>, we ensure safety, compliance, and complete customer satisfaction.
 </p>
 
 <div className={`mt-4 p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
 <h3 className="text-lg uppercase mb-4 tracking-wider text-center sm:text-left">Our Expertise</h3>
 <ul className="space-y-3 opacity-90 text-sm md:text-base grid grid-cols-1 sm:grid-cols-2 gap-x-4">
 <li className="flex items-start gap-2"> Termite Control (Pre & Post Construction)</li>
 <li className="flex items-start gap-2"> Cockroach & General Pest Management</li>
 <li className="flex items-start gap-2"> Bed Bug Eradication</li>
 <li className="flex items-start gap-2"> Rodent & Preventive Solutions</li>
 </ul>
 </div>
 
 <p className="mt-4 font-medium text-center">
 <strong>Reliable. Scientific. Result-Oriented.</strong><br/>
 </p>
 </div>

 <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-4 md:gap-6 w-full mt-4">
 {stats.map((s) => (
 <div key={s.label} className={`flex-1 p-4 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all duration-300 ${isDark ?"border-white/10 bg-white/5 hover:bg-white/10" :"border-black/8 bg-white/60 hover:bg-white/90"}`}>
 <div className={`text-3xl md:text-4xl font-medium ${s.color}`}>{s.value}</div>
 <div className="text-xs opacity-60 uppercase tracking-widest">{s.label}</div>
 </div>
 ))}
 </div>
 </div>

 {/* Right Image Holder (Ankit Bhatt) */}
 <div className="flex flex-col items-center gap-4 shrink-0 lg:w-1/4">
 <div className={`w-48 h-48 md:w-56 md:h-56 xl:w-64 xl:h-64 rounded-full overflow-hidden border border-current/10 shadow-xl group relative ${isDark ?"bg-[#111]" :"bg-gray-100"}`}>
 <img src="abp.jpeg" alt="Ankit Bhatt - Co-founder" className="w-full h-full object-cover object-[center_15%] scale-110 transition-transform duration-700 group-hover:scale-125" onError={(e) => { e.target.src = isDark ?"https://ui-avatars.com/api/?name=Ankit+Bhatt&background=222&color=fff&size=256" :"https://ui-avatars.com/api/?name=Ankit+Bhatt&background=ddd&color=000&size=256"; }} />
 </div>
 <div className="text-center">
 <h3 className="text-xl uppercase tracking-widest">Ankit Bhatt</h3>
 <p className="text-xs opacity-60 uppercase tracking-widest mt-1">Co-founder</p>
 </div>
 </div>
 
 </div>
 </div>
 </section>

 {/* ===== CONTACT ===== */}
 <section id="contact" className="w-full py-16 md:py-28 px-5 md:px-12">
  <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
    <span className="text-xs uppercase tracking-[0.3em] opacity-50 mb-4 block">
      Ready to Protect Your Space?
    </span>

    <h2
      ref={el => el && !titleRefs.current.includes(el) && titleRefs.current.push(el)}
      className="text-4xl sm:text-5xl md:text-7xl uppercase tracking-tight mb-10 md:mb-14"
    >
      Get In Touch
    </h2>

    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const form = e.target;
        const data = new FormData(form);

        try {
          const res = await fetch("https://forminit.com/f/u4rh087l0jt", {
            method: "POST",
            body: data,
          });

          if (res.ok) {
            alert("Message sent successfully ✅");
            form.reset();
          } else {
            alert("Something went wrong ❌");
          }
        } catch {
          alert("Network error ❌");
        }
      }}
      className="w-full flex flex-col gap-5 md:gap-7 text-left"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
        <div>
          <input
            type="text"
            name="full_name"
            placeholder="Your Name"
            required
            className="w-full bg-transparent border-b-2 border-current/20 focus:border-current py-3 outline-none placeholder:opacity-40 text-base transition-colors duration-300"
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            className="w-full bg-transparent border-b-2 border-current/20 focus:border-current py-3 outline-none placeholder:opacity-40 text-base transition-colors duration-300"
          />
        </div>
      </div>

      <div>
        <input
          type="tel"
          name="phone_number"
          placeholder="Phone Number"
          className="w-full bg-transparent border-b-2 border-current/20 focus:border-current py-3 outline-none placeholder:opacity-40 text-base transition-colors duration-300"
        />
      </div>

      <div>
        <textarea
          name="message"
          placeholder="Tell us about your pest control needs..."
          rows={4}
          required
          className="w-full bg-transparent border-b-2 border-current/20 focus:border-current py-3 outline-none placeholder:opacity-40 text-base transition-colors duration-300 resize-none"
        />
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          onMouseMove={handleMagneticMove}
          onMouseLeave={handleMagneticLeave}
          className={`group flex items-center gap-3 px-10 py-4 rounded-full font-semibold text-sm uppercase tracking-widest transition-all duration-300 will-change-transform ${
            isDark
              ? "bg-white text-black hover:bg-gray-100"
              : "bg-[#0c0c0c] text-white hover:bg-[#333]"
          }`}
        >
          Send
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </form>

 {/* Contact Info */}
 <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-center">
 <a href="tel:+919374488004" className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all duration-300 group ${isDark ?"border-white/10 hover:bg-white/10" :"border-black/10 hover:bg-black/5"}`}>
 <Phone size={20} className="opacity-60 group-hover:opacity-100 transition-opacity" />
 <span className="text-xs uppercase tracking-widest opacity-50">Call</span>
 <span className="text-sm font-medium">+91 93744 88004</span>
 </a>
 <a href="https://wa.me/919374488004" target="_blank" rel="noreferrer" className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all duration-300 group ${isDark ?"border-white/10 hover:bg-white/10" :"border-black/10 hover:bg-black/5"}`}>
 <svg className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
 </svg>
 <span className="text-xs uppercase tracking-widest opacity-50">WhatsApp</span>
 <span className="text-sm font-medium">Chat Now</span>
 </a>
 <a href="mailto:contact@abpestcontrol.com" className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all duration-300 group ${isDark ?"border-white/10 hover:bg-white/10" :"border-black/10 hover:bg-black/5"}`}>
 <Mail size={20} className="opacity-60 group-hover:opacity-100 transition-opacity" />
 <span className="text-xs uppercase tracking-widest opacity-50">Email</span>
 <span className="text-sm font-medium break-all">abpestcontrol@gmail.com</span>
 </a>
 </div>
 </div>
 </section>

 {/* ===== GOOGLE MAP ===== */}
 <section id="location" className={`w-full py-16 md:py-24 px-5 md:px-12 ${isDark ?"bg-[#111]" :"bg-[#f1f0ec]"}`}>
 <div className="max-w-7xl mx-auto">
 <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start mb-8 md:mb-12">
 <div>
 <span className="text-xs uppercase tracking-[0.3em] opacity-50 mb-3 block">Find Us</span>
 <h2
 ref={el => el && !titleRefs.current.includes(el) && titleRefs.current.push(el)}
 className="text-2xl md:text-4xl uppercase tracking-widest"
 >
 Our Location
 </h2>
 </div>
 <div className="md:ml-auto flex flex-col gap-2 text-sm opacity-70">
 <div className="flex items-start gap-2">
 <MapPin size={16} className="mt-0.5 shrink-0" />
 <span>Surat, Gujarat — Service available across the city</span>
 </div>
 </div>
 </div>

 <div className="flex flex-col lg:flex-row gap-8 items-stretch">
 {/* Business Card */}
 <div className={`flex-1 p-6 md:p-10 rounded-[2.5rem] border ${isDark ?"bg-[#1a1a1a] border-white/10" :"bg-white border-black/10"} shadow-2xl flex flex-col gap-8 transition-transform hover:scale-[1.01] duration-500`}>
 <div>
 <h3 className="text-xl md:text-2xl font-medium mb-2">A. B. PEST CONTROL INSECTICIDE SERVICES</h3>
 <div className="flex items-center gap-2 mb-2">
 <span className="text-base font-medium text-[#fbbc04]">5.0</span>
 <div className="flex text-[#fbbc04]">
 {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
 </div>
 <a href="https://www.google.com/maps/place/A.+B.+PEST+CONTROL+INSECTICIDE+SERVICES/@21.1925345,72.8222956,17z/data=!4m8!3m7!1s0x3be04f6c449c20a1:0x41ef4190c1f6c4a!8m2!3d21.1925345!4d72.8222956!9m1!1b1!16s%2Fg%2F11b6_v2q_s" target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">30 reviews</a>
 </div>
 <p className="text-sm opacity-60 font-medium">Pest control service in Surat, Gujarat</p>
 </div>

 {/* Action Buttons */}
 <div className="flex justify-between items-center border-y border-current/10 py-4 gap-2">
 {[
 { icon: <Navigation size={20} />, label:"Directions", href:"https://maps.app.goo.gl/RuymFAmDy4fV91To6" },
 { icon: <Bookmark size={20} />, label:"Save", href:"#" },
 { icon: <Phone size={20} />, label:"Call", href:"tel:+919825188413" }
 ].map((action, idx) => (
 <a key={idx} href={action.href} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center gap-2 group">
 <div className="w-10 h-10 rounded-full border border-blue-500/30 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
 {action.icon}
 </div>
 <span className="text-[10px] font-medium uppercase tracking-wider text-blue-500">{action.label}</span>
 </a>
 ))}
 </div>

 {/* Info List */}
 <div className="space-y-5">
 <div className="flex items-start gap-4">
 <MapPin size={20} className="text-blue-500 mt-1 shrink-0" />
 <span className="text-sm md:text-base leading-relaxed opacity-80">BJ House, Chauta Bazar Rd, Rudrapura, Surat, Gujarat 395001, India</span>
 </div>
 <div className="flex items-start gap-4 border-t border-current/5 pt-4">
 <Clock size={20} className="text-blue-500 mt-1 shrink-0" />
 <div className="text-sm md:text-base">
 <div className="flex items-center gap-2">
 <span className="font-medium text-green-600">Open</span>
 <span className="opacity-50">• Closes 6 PM</span>
 </div>
 <p className="text-xs opacity-50 mt-1">Hours: 10:00 AM - 6:00 PM</p>
 </div>
 </div>
 <div className="flex items-start gap-4 border-t border-current/5 pt-4">
 <Phone size={20} className="text-blue-500 mt-1 shrink-0" />
 <span className="text-sm md:text-base opacity-80">+91 98251 88413</span>
 </div>
 </div>
 </div>

 {/* Map */}
 <div className="flex-1 h-137.5 lg:h-auto min-h-125 rounded-[2.5rem] overflow-hidden shadow-2xl border border-current/10 relative group bg-black/5">
 <iframe
 title="AB Pest Control Location"
 className="absolute inset-0 w-full h-full grayscale-[0.3] contrast-[1.2] group-hover:grayscale-0 transition-all duration-1000 ease-out"
 src="https://maps.google.com/maps?q=21.1925345,72.8222956&output=embed"
 style={{ border: 0 }}
 allowFullScreen
 loading="lazy"
 referrerPolicy="no-referrer-when-downgrade"
 />
 {/* Glassmorphic Overlay elements */}
 <div className="absolute inset-0 pointer-events-none border-12px border-transparent group-hover:border-white/5 transition-all duration-1000 rounded-[2.5rem]" />
 
 <a
 href="https://maps.app.goo.gl/RuymFAmDy4fV91To6"
 target="_blank"
 rel="noreferrer"
 className="absolute bottom-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/90 backdrop-blur-md text-[#0c0c0c] text-[10px] font-medium uppercase tracking-[0.2em] shadow-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 pointer-events-auto"
 >
 <Navigation size={18} className="text-blue-600" />
 <span>Navigate</span>
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* ===== FOOTER / SOCIAL ===== */}
 <footer className={`w-full py-12 md:py-16 px-5 md:px-12 ${isDark ?"bg-[#0a0a0a]" :"bg-[#0c0c0c]"} text-white`}>
 <div className="max-w-7xl mx-auto">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-10 md:mb-14">
 {/* Brand */}
 <div>
 <div className="mb-4">
 <Logo variant="horizontal" />
 </div>
 <p className="text-sm text-white/60 leading-relaxed max-w-xs">
 Trusted pest management across Surat & Gujarat since 1976. Licensed, insured, and 100% eco-responsible.
 </p>
 </div>

 {/* Social */}
 <div>
 <h4 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-5">Follow Us</h4>
 <div className="flex gap-3 mb-6">
 {/* Facebook */}
 <a href="https://www.facebook.com/abpestcontrolsurat" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
 </a>
 {/* Instagram */}
 <a href="https://www.instagram.com/abpestcon/" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-pink-600 transition-colors duration-300">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
 </a>
 {/* WhatsApp */}
 <a href="https://wa.me/919374488004" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-600 transition-colors duration-300">
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
 </a>
 </div>
 <div className="text-sm text-white/60">
 <a href="tel:+919374488004" className="hover:text-white transition-colors">+91 93744 88004</a>
 <br />
 <a href="mailto:abpestcontrol@gmail.com" className="hover:text-white transition-colors">abpestcontrol@gmail.com</a>
 </div>
 </div>
 </div>

 <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-white/40">
 <span>© {new Date().getFullYear()} AB Pest Control. All rights reserved.</span>
 <span>Licensed & Insured · Est. 1976</span>
 <Link to="/rushzzz" className="uppercase tracking-[0.2em] hover:text-white transition-colors">
 MADE BY RUSHI BHATT
 </Link>
 </div>
 </div>
 </footer>

 {/* ===== FLOATING ACTIONS ===== */}
 <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-50 flex flex-col gap-3">
 <a
 href="https://wa.me/919374488004"
 target="_blank" rel="noreferrer" title="WhatsApp"
 className="w-11 h-11 flex items-center justify-center rounded-full bg-green-500 shadow-lg hover:scale-110 hover:shadow-green-500/40 transition-all duration-300"
 >
 <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
 </a>
 <a
 href="tel:+919374488004" title="Call Us"
 className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-500 shadow-lg hover:scale-110 hover:shadow-blue-500/40 transition-all duration-300"
 >
 <Phone size={18} className="text-white" />
 </a>
 </div>
 </main>
 </div>
 );
};

export default LandingPage;
