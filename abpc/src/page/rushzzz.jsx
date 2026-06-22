import { useContext, useEffect, useRef } from "react";
import { ArrowLeft, Camera, MessageCircle, Moon, Phone, Sun } from "lucide-react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";

const PROFILE_CARDS = [
  {
    src: "/rushi.jpeg",
    title: "Rushi Bhatt",
    subtitle: "Ahmedabad - Engineering Student",
    desc: "I don't just learn fast - I apply faster.",
    tag: "RUSHZZZ",
  },
  {
    src: "/AR.jpg",
    title: "Bhatt Legacy",
    subtitle: "With Co-Founder Ankit Bhatt",
    desc: "Blending modern thinking with years of real-world expertise.",
    tag: "BHATT LEGACY",
  },
];

export default function RushzzzPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set("[data-card]", { opacity: 1 });

      gsap.from("[data-img]", {
        y: 34,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
      });

      gsap.from("[data-card]", {
        y: 24,
        duration: 0.75,
        delay: 0.15,
        ease: "power3.out",
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={pageRef}
      className={`min-h-screen overflow-hidden transition-colors duration-700 ${
        isDark ? "bg-black text-white" : "bg-[#faf9f6] text-[#0c0c0c]"
      }`}
    >
      <div className={`pointer-events-none fixed inset-0 ${isDark ? "bg-black" : "bg-[#faf9f6]"}`} />

      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className={`fixed left-5 top-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition ${
          isDark
            ? "border-white/25 bg-black text-white hover:border-[#8AA844] hover:text-[#8AA844]"
            : "border-black/15 bg-white/80 text-black backdrop-blur-xl hover:border-[#8AA844] hover:text-[#4C7A2D]"
        }`}
      >
        <ArrowLeft size={19} />
      </button>

      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className={`fixed right-5 top-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition hover:rotate-90 hover:scale-105 ${
          isDark
            ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
            : "border-black/10 bg-black/5 text-black hover:bg-black/10"
        }`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative z-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-20 md:hidden">
        {PROFILE_CARDS.map((card) => (
          <MobileCard key={card.title} {...card} isDark={isDark} />
        ))}
      </div>

      <div className="relative z-10 hidden min-h-screen grid-cols-2 items-center gap-12 px-12 py-12 md:grid">
        {PROFILE_CARDS.map((card) => (
          <DesktopCard key={card.title} {...card} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

function MobileCard({ src, title, subtitle, desc, tag, isDark }) {
  return (
    <section className="flex min-w-full snap-center flex-col gap-6 px-3 pb-10">
      <div
        className={`flex h-[50vh] items-center justify-center overflow-hidden rounded-2xl border shadow-2xl ${
          isDark ? "border-white/15 bg-[#030303]" : "border-black/10 bg-white"
        }`}
      >
        <img src={src} alt={title} data-img className="h-full w-full object-cover" />
      </div>
      <CardContent title={title} subtitle={subtitle} desc={desc} tag={tag} isDark={isDark} />
    </section>
  );
}

function DesktopCard({ src, title, subtitle, desc, tag, isDark }) {
  return (
    <section className="flex flex-col items-center justify-center gap-8">
      <div
        className={`flex h-[65vh] w-full items-center justify-center overflow-hidden rounded-2xl border shadow-2xl ${
          isDark ? "border-white/15 bg-[#030303]" : "border-black/10 bg-white"
        }`}
      >
        <img
          src={src}
          alt={title}
          data-img
          className="h-full w-full object-cover transition duration-500 hover:scale-105"
        />
      </div>
      <CardContent title={title} subtitle={subtitle} desc={desc} tag={tag} isDark={isDark} />
    </section>
  );
}

function CardContent({ title, subtitle, desc, tag, isDark }) {
  return (
    <div
      data-card
      className={`relative mx-auto w-full max-w-md overflow-hidden rounded-2xl px-8 py-8 opacity-100 transition-all duration-300 hover:-translate-y-2 ${
        isDark
          ? "border border-white/18 bg-[#050505] text-white shadow-[0_24px_90px_rgba(0,0,0,0.95)] hover:border-[#8AA844]/70"
          : "border border-black/10 bg-white text-[#0c0c0c] shadow-[0_18px_60px_rgba(12,12,12,0.08)] hover:border-[#8AA844]/70"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] ${
            isDark
              ? "border-[#8AA844]/60 bg-[#8AA844]/12 text-[#E9F6D0]"
              : "border-[#8AA844]/40 bg-[#8AA844]/12 text-[#4C7A2D]"
          }`}
        >
          {tag}
        </span>
      </div>

      <h1 className={`mt-6 text-4xl font-black tracking-normal md:text-5xl ${isDark ? "text-white" : "text-[#0c0c0c]"}`}>
        {title}
      </h1>

      <p className={`mt-4 text-base font-black uppercase tracking-[0.16em] ${isDark ? "text-[#D7F2A0]" : "text-[#4C7A2D]"}`}>
        {subtitle}
      </p>

      {title === "Rushi Bhatt" && (
        <p className={`mt-4 text-sm font-semibold leading-6 tracking-[0.12em] ${isDark ? "text-zinc-100" : "text-black/75"}`}>
          Part of the Bhatt legacy - Nephew of Co-Founder Ankit Bhatt
        </p>
      )}

      <p className={`mt-6 text-base font-bold leading-8 ${isDark ? "text-white" : "text-[#0c0c0c]"}`}>{desc}</p>

      {title === "Rushi Bhatt" && (
        <div className="mt-8 flex items-center gap-4">
          <SocialLink href="tel:9727062513" label="Call Rushi Bhatt" isDark={isDark} accent="orange">
            <Phone size={20} />
          </SocialLink>
          <SocialLink href="https://wa.me/919727062513" label="Message Rushi Bhatt on WhatsApp" isDark={isDark} accent="green">
            <MessageCircle size={21} />
          </SocialLink>
          <SocialLink href="https://www.instagram.com/rushzzz10/?utm_source=ig_web_button_share_sheet" label="Open Rushi Bhatt on Instagram" isDark={isDark} accent="orange">
            <Camera size={21} />
          </SocialLink>
        </div>
      )}

      <div className="mt-8 h-1.5 w-24 rounded-full bg-[#8AA844]" />
      <p className={`mt-4 text-xs font-black uppercase tracking-[0.28em] ${isDark ? "text-zinc-100" : "text-black/60"}`}>
        Profile
      </p>
    </div>
  );
}

function SocialLink({ href, label, isDark, accent, children }) {
  const accentClass = accent === "green" ? "hover:border-[#8AA844]" : "hover:border-[#F04925]";

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      title={label}
      aria-label={label}
      className={`inline-flex h-14 w-14 items-center justify-center rounded-full border transition hover:scale-105 ${accentClass} ${
        isDark ? "border-white/25 bg-white/5 text-white" : "border-black/15 bg-black/5 text-black"
      }`}
    >
      {children}
    </a>
  );
}
