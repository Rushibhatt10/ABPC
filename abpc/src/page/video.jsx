import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, VolumeX, Volume2, Play, Pause } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext.jsx';

const videos = [
  {
    src: '/china.mp4',
    title: 'China Pest Trends',
    description: 'International insights and industry observations.'
  },
  {
    src: '/diff.mp4',
    title: 'Indian vs Foreign pests',
    description: 'Understanding the differences between the pests.'
  },
  {
    src: '/future.mp4',
    title: 'Awareness and Future of Pest Control',
    description: 'How the industry grow and how important is this'
  },
  {
    src: '/hyg.mp4',
    title: 'Hygiene & Prevention',
    description: 'Simple habits that help keep pests away.'
  },
  {
    src: '/india.mp4',
    title: 'Pest Control in India',
    description: 'Challenges, growth and opportunities.'
  },
  {
    src: '/kid.mp4',
    title: 'Family Safety',
    description: 'Keeping children and families protected.'
  },
  {
    src: '/mes.mp4',
    title: 'Expert Advice',
    description: 'Professional recommendations and tips.'
  },
  {
    src: '/mum.mp4',
    title: 'The vast experience ',
    description: 'Professional work and solving problems.'
  },
  {
    src: '/papa.mp4',
    title: 'AB Pest Control',
    description: 'How all this businesses started,the legacy (The digital team too).'
  },
  {
    src: '/random.mp4',
    title: 'Common Questions',
    description: 'Answers to frequently asked concerns.(Not acting for being the best pest control)'
  },
  {
    src: 'vid.mp4' ,
    title:'Cockroach vs Termites',
    description: "How both the pests are dangerous if not treated"
  },
  {
    src: '/rest.mp4',
    title: 'Restaurant Management',
    description: 'Protecting food businesses and reputation.'
  },
  {
    src: '/tech.mp4',
    title: 'Technology in Pest Control',
    description: 'Modern methods and smart monitoring, and even 1st digitalised pest control'
  },
  {
    src: '/example.mp4',
    title: 'Industry Discussion',
    description: 'Insights from real-world experience.'
  }
];

function ReelItem({ video, index, globalMuted, onMuteToggle }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTap, setShowTap] = useState(false);
  const tapTimeoutRef = useRef(null);

  // IntersectionObserver: auto-play when ≥60% visible, pause otherwise
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          el.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync mute state from global
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = globalMuted;
  }, [globalMuted]);

  const handleTap = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }

    // Show tap indicator briefly
    setShowTap(true);
    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setShowTap(false), 700);
  }, []);

  useEffect(() => () => clearTimeout(tapTimeoutRef.current), []);

  return (
    <div
      className="reel-item relative w-full flex-shrink-0 snap-start"
      style={{ height: '100svh' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={video.src}
        loop
        playsInline
        muted={globalMuted}
        preload={index === 0 ? 'auto' : 'metadata'}
        onClick={handleTap}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        style={{ touchAction: 'pan-y' }}
      />

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%)'
        }}
      />

      {/* Tap to play/pause indicator */}
      {showTap && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              animation: 'reelTapPop 0.65s ease forwards'
            }}
          >
            {isPlaying
              ? <Pause size={30} color="white" />
              : <Play size={30} color="white" style={{ marginLeft: 4 }} />
            }
          </div>
        </div>
      )}

      {/* Bottom caption */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pointer-events-none">
        {/* Index pill */}
        <span
          className="inline-block mb-3 px-3 py-1 rounded-full text-white text-[10px] uppercase tracking-[0.22em]"
          style={{ background: 'rgba(240,73,37,0.85)', backdropFilter: 'blur(4px)' }}
        >
          {String(index + 1).padStart(2, '0')} / {String(videos.length).padStart(2, '0')}
        </span>

        <h2 className="text-white text-xl font-semibold leading-snug drop-shadow-lg">
          {video.title}
        </h2>
        <p className="text-white/70 text-sm mt-1 leading-relaxed drop-shadow">
          {video.description}
        </p>

        {/* Label */}
        <p className="mt-3 text-white/40 text-[10px] uppercase tracking-[0.28em]">
          Podcast Clip · AB Pest Control
        </p>
      </div>
    </div>
  );
}

export default function VideoPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [muted, setMuted] = useState(true);

  return (
    <>
      {/* Keyframe for tap animation — injected once */}
      <style>{`
        @keyframes reelTapPop {
          0%   { opacity: 0; transform: scale(0.7); }
          35%  { opacity: 1; transform: scale(1.1); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        .reel-scroll-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .reel-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Full-screen black container */}
      <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">

        {/*
          Desktop: a centered portrait column (max 400px wide, full viewport height).
          Mobile: full width, full height — true reels feel.
        */}
        <div
          className="relative flex flex-col"
          style={{
            width: 'min(100vw, calc(100svh * 9 / 16))',
            height: '100svh',
            maxWidth: '100vw',
          }}
        >
          {/* Snap-scroll reel container */}
          <div
            className="reel-scroll-container w-full h-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollBehavior: 'smooth' }}
          >
            {videos.map((video, i) => (
              <ReelItem
                key={video.src}
                video={video}
                index={i}
                globalMuted={muted}
                onMuteToggle={() => setMuted(m => !m)}
              />
            ))}
          </div>

          {/* Top-left back button — positioned inside the column */}
          <div
            className="absolute top-0 left-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
              aria-label="Go back"
            >
              <div
                className="p-2 rounded-full transition-all duration-300"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}
              >
                <ArrowLeft size={16} color="white" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                Back
              </span>
            </button>
          </div>

          {/* Top-right mute toggle — positioned inside the column */}
          <div
            className="absolute top-0 right-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          >
            <button
              onClick={() => setMuted(m => !m)}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="p-2.5 rounded-full transition-all duration-300"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)'
              }}
            >
              {muted
                ? <VolumeX size={18} color="white" />
                : <Volume2 size={18} color="white" />
              }
            </button>
          </div>

          {/* Top-center title — inside the column */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pt-[calc(env(safe-area-inset-top)+1rem)] pointer-events-none">
            <p className="text-white/50 text-[10px] uppercase tracking-[0.3em] whitespace-nowrap">
              Podcast Reels
            </p>
          </div>
        </div>

        {/* Grain overlay — full screen, behind everything */}
        <div
          className="fixed inset-0 pointer-events-none z-30 opacity-[0.025] mix-blend-overlay"
          style={{
            backgroundImage:
              "url('https://grainy-gradients.vercel.app/noise.svg')"
          }}
        />
      </div>
    </>
  );
}
