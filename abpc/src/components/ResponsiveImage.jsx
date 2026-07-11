/**
 * Serves locally optimized WebP with responsive srcset when available.
 */
export default function ResponsiveImage({
  base,
  alt,
  className = "",
  sizes = "100vw",
  widths = [256, 512],
  fallbackExt = "png",
  loading = "lazy",
  width,
  height,
  style,
}) {
  const hasResponsive = widths.length > 0;
  const srcSet = hasResponsive
    ? widths.map((w) => `/${base}-${w}.webp ${w}w`).join(", ")
    : undefined;

  return (
    <picture>
      {hasResponsive && (
        <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      )}
      <img
        src={`/${base}.webp`}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        style={style}
        onError={(e) => {
          if (!e.currentTarget.dataset.fallback) {
            e.currentTarget.dataset.fallback = "1";
            e.currentTarget.src = `/${base}.${fallbackExt}`;
          }
        }}
      />
    </picture>
  );
}
