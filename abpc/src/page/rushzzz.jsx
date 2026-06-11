import { useEffect, useRef } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";

const PROFILE_CARDS = [
  {
    src: "/rushi.jpeg",
    title: "Rushi Bhatt",
    subtitle: "Ahmedabad — Engineering Student",
    desc: "I don't just learn fast — I apply faster.",
    premium: true,
    tag: "RUSHZZZ",
  },
  {
    src: "/AR.jpg",
    title: "Bhatt Legacy",
    subtitle: "With Co-Founder Ankit Bhatt",
    desc: "Blending modern thinking with years of real-world expertise.",
    premium: true,
    tag: "BHATT LEGACY",
  },
];

export default function RushzzzPage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-img]", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
        stagger: 0.15,
      });

      gsap.from("[data-card]", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        delay: 0.2,
        ease: "power3.out",
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden"
    >
      {/* Bright gradient backdrop glow */}
      <div className="pointer-events-none fixed inset-0 top-0 h-96 bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-violet-500/20 via-transparent to-transparent blur-3xl" />

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-50 p-3 rounded-full border border-cyan-300/40 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-cyan-300/80 transition shadow-lg"
      >
        <ArrowLeft size={18} className="text-cyan-300" />
      </button>


      {/* MOBILE */}
      <div className="flex snap-x snap-mandatory overflow-x-auto pt-20 md:hidden px-4 gap-4">
        {PROFILE_CARDS.map((card) => (
          <MobileCard key={card.title} {...card} />
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:grid grid-cols-2 min-h-screen gap-12 px-12 py-12 items-center">
        {PROFILE_CARDS.map((card) => (
          <DesktopCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}

/* ===== MOBILE ===== */
function MobileCard({ src, title, subtitle, desc, premium, tag }) {
  return (
    <section className="min-w-full snap-center flex flex-col gap-6 px-3 pb-10">
      <div className="h-[50vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
        <img
          src={src}
          alt={title}
          data-img
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent title={title} subtitle={subtitle} desc={desc} premium={premium} tag={tag} />
    </section>
  );
}

/* ===== DESKTOP ===== */
function DesktopCard({ src, title, subtitle, desc, premium, tag }) {
  return (
    <section className="flex flex-col items-center justify-center gap-8">
      <div className="h-[65vh] w-full flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl">
        <img
          src={src}
          alt={title}
          data-img
          className="w-full h-full object-cover transition duration-500 hover:scale-105"
        />
      </div>
      <CardContent title={title} subtitle={subtitle} desc={desc} premium={premium} tag={tag} />
    </section>
  );
}

/* ===== CARD ===== */
function CardContent({ title, subtitle, desc, premium, tag }) {
  return (
    <div
      data-card
      className="
        w-full max-w-md mx-auto
        relative
        overflow-hidden
        rounded-3xl
        border border-cyan-300/50
        bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90
        px-8 py-8
        shadow-[0_20px_70px_rgba(6,182,212,0.25)]
        backdrop-blur-2xl
        transition-all duration-300
        hover:-translate-y-3
        hover:border-cyan-300/80
        hover:shadow-[0_30px_100px_rgba(6,182,212,0.35)]
      "
    >


      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-cyan-100 font-semibold">
          {tag}
        </span>
      </div>

      <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl drop-shadow-lg">
        {title}
      </h1>

      <p className="mt-4 text-base uppercase tracking-[0.22em] text-cyan-200 font-semibold">
        {subtitle}
      </p>

      {title === "Rushi Bhatt" && (
        <p className="mt-4 text-sm tracking-[0.32em] text-slate-300">
          Part of the Bhatt legacy — Nephew of Co-Founder Ankit Bhatt
        </p>
      )}

      <p className="mt-6 text-base leading-8 text-slate-100 font-medium">
        {desc}
      </p>

      {title === "Rushi Bhatt" && (
        <div className="mt-8 flex items-center gap-4">
          <a
            href="tel:9727062513"
            title="Call"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 text-cyan-200 transition hover:scale-110 hover:border-cyan-300 hover:bg-cyan-400/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            <Phone size={20} />
          </a>
          <a
            href="https://wa.me/919727062513"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400/60 bg-gradient-to-br from-green-400/30 to-emerald-500/30 transition hover:scale-110 hover:border-green-300 hover:bg-green-400/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              className="h-6 w-6"
            />
          </a>
          <a
            href="https://www.instagram.com/rushzzz10/?utm_source=ig_web_button_share_sheet"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-pink-400/60 bg-gradient-to-br from-pink-400/30 to-rose-500/30 transition hover:scale-110 hover:border-pink-300 hover:bg-pink-400/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-6 w-6 text-pink-200"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
              <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
              <path d="M17.5 6.5h.01" />
            </svg>
          </a>
        </div>
      )}

      <div className="mt-8 h-2 w-24 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 shadow-lg" />

      <p className="mt-4 text-xs tracking-[0.35em] text-slate-300 uppercase font-semibold">Profile</p>
    </div>
  );
}
