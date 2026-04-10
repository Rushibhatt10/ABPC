import { useEffect, useRef } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";

const PROFILE_CARDS = [
  {
    src: "rushi.jpeg",
    title: "Rushi Bhatt",
    subtitle: "Ahmedabad — Engineering Student",
    desc: "I don't just learn fast — I apply faster.",
  },
  {
    src: "rus.jpg",
    title: "Bhatt Legacy",
    subtitle: "With Co-Founder Ankit Bhatt",
    desc: "Blending modern thinking with years of real-world expertise.",
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
      className="min-h-screen bg-[#030303] text-white overflow-hidden"
    >
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-50 p-3 rounded-full border border-white/10 bg-black hover:bg-white/10 transition"
      >
        <ArrowLeft size={18} />
      </button>

      {/* MOBILE */}
      <div className="flex snap-x snap-mandatory overflow-x-auto pt-20 md:hidden">
        {PROFILE_CARDS.map((card) => (
          <MobileCard key={card.title} {...card} />
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:grid grid-cols-2 min-h-screen">
        {PROFILE_CARDS.map((card) => (
          <DesktopCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}

/* ===== MOBILE ===== */
function MobileCard({ src, title, subtitle, desc }) {
  return (
    <section className="min-w-full snap-center flex flex-col gap-8 px-5 pb-10">

      <div className="h-[55vh] flex items-center justify-center">
        <img
          src={src}
          alt={title}
          data-img
          className="w-full h-full object-contain"
        />
      </div>

      <CardContent title={title} subtitle={subtitle} desc={desc} />
    </section>
  );
}

/* ===== DESKTOP ===== */
function DesktopCard({ src, title, subtitle, desc }) {
  return (
    <section className="flex flex-col items-center justify-center px-16 py-20">

      <div className="h-[60vh] w-full flex items-center justify-center">
        <img
          src={src}
          alt={title}
          data-img
          className="w-full h-full object-contain transition duration-500 hover:scale-[1.03]"
        />
      </div>

      <CardContent title={title} subtitle={subtitle} desc={desc} />
    </section>
  );
}

/* ===== CARD ===== */
function CardContent({ title, subtitle, desc }) {
  return (
    <div
      data-card
      className="w-full max-w-sm mx-auto border border-white/15 rounded-xl px-6 py-5 bg-black/60 backdrop-blur-sm transition duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
    >
      {/* TITLE */}
      <h1 className="text-xl font-semibold tracking-tight text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
        {title}
      </h1>

      {/* SUBTITLE */}
      <p className="mt-1 text-xs text-white/70 tracking-wide">
        {subtitle}
      </p>

      {/* EXTRA */}
      {title === "Rushi Bhatt" && (
        <p className="mt-1 text-[11px] text-white/55">
          Part of the Bhatt legacy — Nephew of Co-Founder Ankit Bhatt
        </p>
      )}

      {/* DESC */}
      <p className="mt-4 text-sm text-white/85 leading-relaxed">
        {desc}
      </p>

      {/* CONTACT ICONS */}
      {title === "Rushi Bhatt" && (
        <div className="mt-5 flex items-center gap-4">

          {/* CALL */}
          <a
            href="tel:9727062513"
            title="Call"
            className="p-2 rounded-full border border-white/15 hover:border-cyan-400 hover:bg-cyan-400/10 transition"
          >
            <Phone size={16} className="text-cyan-300" />
          </a>

          {/* WHATSAPP */}
          <a
            href="https://wa.me/919727062513"
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            className="p-2 rounded-full border border-white/15 hover:border-green-400 hover:bg-green-400/10 transition"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              className="w-4 h-4"
            />
          </a>

          {/* INSTAGRAM */}
          <a
            href="https://www.instagram.com/rushzzz10/?utm_source=ig_web_button_share_sheet"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="p-2 rounded-full border border-white/15 hover:border-pink-400 hover:bg-pink-400/10 transition"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 text-pink-400"
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

      {/* LINE */}
      <div className="mt-5 h-[1.5px] w-12 bg-cyan-400" />

      <p className="mt-3 text-[10px] tracking-[0.3em] text-white/50">
        PROFILE
      </p>
    </div>
  );
}
