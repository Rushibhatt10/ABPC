import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function RushzzzPage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".card", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.2,
      });

      gsap.from(".image", {
        scale: 1.1,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="h-screen bg-[#07090c] text-white overflow-hidden">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-5 left-5 z-50 bg-white/10 backdrop-blur-xl p-3 rounded-full border border-white/10 hover:bg-white/20 transition"
      >
        <ArrowLeft size={18} />
      </button>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth">

        <MobileCard
          src="rushi.jpeg"
          title="Rushi Bhatt"
          subtitle="Ahmedabad · Engineering Student"
          desc="I don’t just learn fast — I apply faster."
        />

        <MobileCard
          src="rus.jpg"
          title="Bhatt Legacy"
          subtitle="With Co-Founder Ankit Bhatt"
          desc="Blending modern thinking with years of real-world expertise."
        />
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:grid grid-cols-2 h-full">

        <DesktopCard
          src="rushi.jpeg"
          title="Rushi Bhatt"
          subtitle="Ahmedabad · Engineering Student"
          desc="I don’t just learn fast — I apply faster."
        />

        <DesktopCard
          src="rus.jpg"
          title="Bhatt Legacy"
          subtitle="With Co-Founder Ankit Bhatt"
          desc="Blending modern thinking with years of real-world expertise."
        />
      </div>
    </div>
  );
}

/* ===== MOBILE CARD ===== */
function MobileCard({ src, title, subtitle, desc }) {
  return (
    <div className="snap-center min-w-full h-full flex flex-col justify-between">

      {/* IMAGE */}
      <div className="h-[60%] flex items-center justify-center px-4">
        <img
          src={src}
          className="image w-full h-full object-contain drop-shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
        />
      </div>

      {/* TEXT */}
      <CardContent title={title} subtitle={subtitle} desc={desc} />
    </div>
  );
}

/* ===== DESKTOP CARD ===== */
function DesktopCard({ src, title, subtitle, desc }) {
  return (
    <div className="flex flex-col justify-between items-center h-full p-8">

      {/* IMAGE */}
      <div className="h-[65%] w-full flex items-center justify-center">
        <img
          src={src}
          className="image w-full h-full object-contain drop-shadow-[0_50px_140px_rgba(0,0,0,0.9)] transition-transform duration-700 hover:scale-[1.03]"
        />
      </div>

      {/* TEXT */}
      <CardContent title={title} subtitle={subtitle} desc={desc} />
    </div>
  );
}

/* ===== CARD CONTENT ===== */
function CardContent({ title, subtitle, desc }) {
  return (
    <div className="card w-full max-w-md mx-auto mb-6 p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">

      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>

      <p className="text-sm text-white/50 mt-1">
        {subtitle}
      </p>

      {title === "Rushi Bhatt" && (
        <p className="text-xs text-white/30 mt-1">
          Part of the Bhatt legacy · Nephew of Co-Founder Ankit Bhatt
        </p>
      )}

      <p className="mt-4 text-sm text-white/70 leading-relaxed">
        {desc}
      </p>

      {title === "Rushi Bhatt" && (
        <a
          href="mailto:rushibhatt91@gmail.com"
          className="mt-4 inline-block text-sm text-green-400 hover:text-green-300 transition"
        >
          rushibhatt91@gmail.com
        </a>
      )}

      {/* ACCENT LINE */}
      <div className="mt-5 h-2px w-10 bg-gradient from-green-400 to-lime-300 rounded-full" />

      <p className="mt-3 text-[10px] text-white/30 tracking-[0.3em]">
        PROFILE
      </p>
    </div>
  );
}