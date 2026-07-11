import { useEffect, useRef, useState } from "react";

const MAP_SRC =
  "https://maps.google.com/maps?q=21.1925345,72.8222956&output=embed";

export default function LazyMapEmbed({ className = "", title = "Map" }) {
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <iframe
          title={title}
          className="absolute inset-0 w-full h-full grayscale-[0.3] contrast-[1.2]"
          src={MAP_SRC}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/5 text-xs uppercase tracking-widest opacity-40"
          aria-hidden="true"
        >
          Loading map…
        </div>
      )}
    </div>
  );
}
