import React from "react";

export default function Logo({ className = "", variant = "stacked" }) {
  const isHorizontal = variant === "horizontal";

  return (
    <div
      className={`flex ${
        isHorizontal
          ? "flex-row items-center gap-3"
          : "flex-col items-center justify-center w-full"
      } ${className}`}
    >
      {/* Logo Icon */}
      <div
        className={`${
          isHorizontal
            ? "w-12 md:w-14 shrink-0"
            : "w-[22%] min-w-[90px] max-w-[140px] mb-3"
        }`}
      >
        <img
          src="cropped_circle_image.png"
          alt="A.B. Pest Control"
          className="w-full h-auto object-contain select-none"
          draggable="false"
        />
      </div>

      {/* Text Area */}
      {isHorizontal ? (
        <div className="flex flex-col leading-none select-none">
          {/* Main Title */}
          <span
            className="uppercase whitespace-nowrap"
            style={{
              fontFamily: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
              fontSize: "1.4rem",
              color: "#8AA844",
              transform: "scaleY(1.1)",
              letterSpacing: "0.02em",
            }}
          >
            A.B. PEST CONTROL
          </span>

          {/* Subtitle */}
          <span
            className="uppercase pt-1 whitespace-nowrap"
            style={{
              fontFamily: 'Montserrat, "Segoe UI", Arial, sans-serif',
              fontSize: "0.55rem",
              color: "#F04925",
              letterSpacing: "0.35em",
            }}
          >
            INSECTICIDE SERVICES
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center w-full select-none">
          {/* Main Title */}
          <div
            className="uppercase whitespace-nowrap"
            style={{
              fontFamily: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
              fontSize: "min(10vw, 3.5rem)", // 🔥 reduced size
              color: "#8AA844",
              transform: "scaleY(1.15)",
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            A.B. PEST CONTROL
          </div>

          {/* Subtitle */}
          <div
            className="uppercase pt-3 whitespace-nowrap"
            style={{
              fontFamily: 'Montserrat, "Segoe UI", Arial, sans-serif',
              fontSize: "min(2.5vw, 1rem)",
              color: "#F04925",
              letterSpacing: "0.45em",
              marginRight: "-0.45em",
              lineHeight: 1,
            }}
          >
            INSECTICIDE SERVICES
          </div>
        </div>
      )}
    </div>
  );
}