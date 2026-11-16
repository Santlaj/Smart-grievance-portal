import React from "react";
import aiIconImg from "../../assets/ai-assistant-icon.png";

/**
 * CivicSaathi AI Assistant Mascot Icon
 * Uses the custom civic assistant illustration:
 * - Friendly civic guide with "HI!" greeting bubble & municipal assistant bot
 * - Responsive presets: xs, sm, md, lg, xl, hero
 * - Supported states: "idle", "thinking", "active"
 * - Optional electric-blue beacon (zero green)
 */
export function CivicSaathiMascot({
  state = "idle", // "idle" | "thinking" | "active"
  size = "md", // "xs" | "sm" | "md" | "lg" | "xl" or custom
  className = "",
  showBeacon = false,
  animated = true,
  onClick,
}) {
  const sizeMap = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-14 w-14",
    hero: "h-20 w-20",
  };

  const containerSize = sizeMap[size] || size || "h-10 w-10";

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${containerSize} ${className}`}
      aria-label={`CivicSaathi AI Assistant (${state})`}
    >
      <div className="relative h-full w-full rounded-2xl bg-white p-1 shadow-xs border border-white/40 flex items-center justify-center overflow-hidden">
        <img
          src={aiIconImg}
          alt="CivicSaathi AI Assistant"
          className={`h-full w-full object-contain transition-transform duration-300 ${
            animated && state === "thinking"
              ? "animate-pulse scale-105"
              : animated && state === "active"
              ? "scale-110"
              : "group-hover:scale-105"
          }`}
        />
      </div>

      {showBeacon && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#38BDF8] shadow-xs"></span>
        </span>
      )}
    </div>
  );
}

export default CivicSaathiMascot;
