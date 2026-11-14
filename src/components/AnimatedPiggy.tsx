import React, { useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface ProPiggyIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ProPiggyIcon: React.FC<ProPiggyIconProps> = ({
  size = 24,
  strokeWidth = 2,
  className = ""
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Sleek geometric side-profile piggy silhouette */}
    <path d="M19 10.5c0-3.2-2.9-5.5-7-5.5-3.4 0-6.2 1.8-7.1 4.4-.5-.3-1.2-.2-1.6.2-.5.5-.4 1.4.3 1.7.3.1.6.1.9.1v1.1c0 1.8.8 3.4 2.1 4.4l.4 2.3c.1.5.5.8 1 .8h1.2c.5 0 .9-.3 1-.8l.2-1.2c.5.1 1 .1 1.6.1s1.1 0 1.6-.1l.2 1.2c.1.5.5.8 1 .8H16c.5 0 .9-.3 1-.8l.4-2.1c1-.7 1.7-1.7 2-2.9h1.1c.8 0 1.5-.7 1.5-1.5v-1.2c0-.8-.7-1.5-1.5-1.5H19Z" />
    {/* Sculpted forward ear */}
    <path d="M15.2 5.4 16.8 3c.3-.4.9-.2.9.3v2.9" />
    {/* Top coin slot */}
    <path d="M9.8 7.8h4" />
    {/* Minimalist eye */}
    <circle cx="16.4" cy="10.4" r="0.85" fill="currentColor" stroke="none" />
  </svg>
);

interface AnimatedPiggyProps {
  progress?: number;
  size?: number;
  isHappy?: boolean;
  interactive?: boolean;
  showRing?: boolean;
  showHint?: boolean;
  onCoinDrop?: () => void;
}

export const AnimatedPiggy: React.FC<AnimatedPiggyProps> = ({
  progress = 50,
  size = 180,
  interactive = true,
  showRing = true,
  showHint = true,
  onCoinDrop
}) => {
  const uid = useId().replace(/:/g, "");
  const [coins, setCoins] = useState<{ id: number; x: number }[]>([]);
  const [isTapping, setIsTapping] = useState(false);

  const cappedProgress = Math.min(100, Math.max(0, progress));
  const isCompleted = cappedProgress >= 100;
  const isCompact = size <= 72;

  const triggerCoinDrop = () => {
    if (!interactive) return;
    const newCoin = { id: Date.now() + Math.random(), x: (Math.random() - 0.5) * 14 };
    setCoins(prev => [...prev.slice(-3), newCoin]);
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 380);
    if (onCoinDrop) onCoinDrop();
  };

  if (isCompact) {
    const r = 22;
    const circ = 2 * Math.PI * r;
    const offset = circ - (cappedProgress / 100) * circ;

    return (
      <div
        className="relative flex items-center justify-center select-none"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 56 56" className="w-full h-full">
          <defs>
            <linearGradient id={`compactRing-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064E3B" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="#ECFDF5"
            stroke="#E2E8F0"
            strokeWidth="3.5"
          />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={`url(#compactRing-${uid})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 28 28)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[#065F46]">
          <ProPiggyIcon size={Math.round(size * 0.48)} strokeWidth={2} />
        </div>
      </div>
    );
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cappedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        onClick={triggerCoinDrop}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerCoinDrop();
          }
        } : undefined}
        aria-label={interactive ? "Simular depósito no cofrinho" : "Cofrinho"}
      >
        {/* Falling Champagne-Gold R$ Coins */}
        <AnimatePresence>
          {coins.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: -48, x: c.x, scale: 0.75 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-48, -18, 8], scale: [0.75, 1, 0.45] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-3 z-30 pointer-events-none"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-md border border-amber-700/40 flex items-center justify-center font-bold text-amber-950 text-[10px] tracking-tight">
                R$
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div
          animate={{
            scale: isTapping ? [1, 0.96, 1.02, 1] : 1,
            y: isTapping ? [0, 2, -2, 0] : 0
          }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={interactive ? "relative z-10 w-full h-full cursor-pointer" : "relative z-10 w-full h-full"}
        >
          <svg
            viewBox="0 0 160 160"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`ringGrad-${uid}`} x1="16" y1="16" x2="144" y2="144" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#064E3B" />
                <stop offset="55%" stopColor="#0B8A46" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>

              <radialGradient id={`medallionBg-${uid}`} cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#F0FDF4" />
                <stop offset="100%" stopColor="#DCFCE7" />
              </radialGradient>

              <linearGradient id={`bodyGrad-${uid}`} x1="44" y1="48" x2="112" y2="118" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="45%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>

              <linearGradient id={`snoutGrad-${uid}`} x1="112" y1="74" x2="124" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              <linearGradient id={`coinGrad-${uid}`} x1="67" y1="40" x2="87" y2="62" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>

              <clipPath id={`coinSlotClip-${uid}`}>
                <rect x="56" y="34" width="44" height="27" />
              </clipPath>
            </defs>

            {/* Studio Circular Medallion */}
            <circle
              cx="80"
              cy="80"
              r="58"
              fill={`url(#medallionBg-${uid})`}
              stroke="#D1FAE5"
              strokeWidth="1.25"
            />

            {/* Precision Progress Gauge */}
            {showRing && (
              <>
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="5.5"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={`url(#ringGrad-${uid})`}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 80 80)"
                  className="transition-all duration-700 ease-out"
                />
              </>
            )}

            {/* Contact Shadow */}
            <ellipse cx="80" cy="117" rx="30" ry="3.8" fill="#064E3B" fillOpacity="0.14" />

            {/* Brushed-Gold Coin Resting in Top Slot */}
            <g clipPath={`url(#coinSlotClip-${uid})`}>
              <circle
                cx="78"
                cy="54"
                r="10.5"
                fill={`url(#coinGrad-${uid})`}
                stroke="#92400E"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <circle
                cx="78"
                cy="54"
                r="7.4"
                fill="none"
                stroke="#FEF9C3"
                strokeOpacity="0.7"
                strokeWidth="0.9"
              />
            </g>

            {/* Shaded Far Legs (Depth Layer) */}
            <path
              d="M64 102v10c0 1.8-1.4 3-3.2 3h-3.4c-1.7 0-3-1.2-3-2.8V101Z"
              fill="#064E3B"
            />
            <path
              d="M100 102v10c0 1.8-1.4 3-3.2 3h-3.4c-1.7 0-3-1.2-3-2.8V101Z"
              fill="#064E3B"
            />

            {/* Main Sculpted Ceramic Body */}
            <path
              d="M111.5 76.5c-1.8-11-12.7-19-28.5-19-16.8 0-31 10-33.2 22.8-.3 1.7-.4 3.4-.3 5 .4 6.5 3.6 12.2 8.7 16.3l1.6 10.6c.3 1.8 1.8 3.1 3.6 3.1h4.6c1.8 0 3.3-1.3 3.5-3.1l1-6.5c3.2.7 6.7 1.1 10.4 1.1 3.2 0 6.4-.3 9.3-.9l1 6.3c.3 1.8 1.8 3.1 3.6 3.1h4.6c1.8 0 3.3-1.3 3.6-3.1l1.5-9.8c3.6-2.4 6.1-5.6 7.4-9.3h3.2c2.5 0 4.5-2 4.5-4.5v-5.6c0-2.5-2-4.5-4.5-4.5h-2.1Z"
              fill={`url(#bodyGrad-${uid})`}
            />

            {/* Sleek Forward Ear */}
            <path
              d="M91.5 59.5 98.2 47c1-1.9 3.8-1.3 4 .9l.7 12.6Z"
              fill="#059669"
            />
            <path
              d="M94.2 58.6 98.8 50c.4-.8 1.6-.6 1.7.4l.4 8.2Z"
              fill="#6EE7B7"
              fillOpacity="0.65"
            />

            {/* Sculpted Curly Tail Accent */}
            <path
              d="M49.5 82.5c-3.8 0-6.2-2.6-5.2-5.4.8-2.2 3.4-2.7 4.6-1 1 1.4 0 3.4-1.8 3.4"
              stroke="#059669"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Specular Crown Highlight */}
            <path
              d="M59 71c5.5-6.2 15-9.2 25.5-8.8"
              stroke="#FFFFFF"
              strokeOpacity="0.48"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Recessed Top Coin Slot */}
            <rect
              x="67.5"
              y="59.4"
              width="21"
              height="3.6"
              rx="1.8"
              fill="#022C22"
            />

            {/* Sculpted Snout Faceplate */}
            <rect
              x="112"
              y="76.5"
              width="9.5"
              height="15.5"
              rx="4.75"
              fill={`url(#snoutGrad-${uid})`}
            />
            <circle cx="117.2" cy="82.2" r="1.25" fill="#022C22" />
            <circle cx="117.2" cy="86.5" r="1.25" fill="#022C22" />

            {/* Clean Minimalist Eye */}
            <circle cx="102.5" cy="73.5" r="2.2" fill="#022C22" />
            <circle cx="103.2" cy="72.8" r="0.7" fill="#FFFFFF" />
          </svg>

          {/* Completion Check Badge */}
          {isCompleted && (
            <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-[#0B8A46] text-white flex items-center justify-center shadow-md border-2 border-white">
              <Check size={14} strokeWidth={3} />
            </div>
          )}
        </motion.div>
      </div>

      {interactive && showHint && (
        <span className="mt-2 text-[11px] font-medium text-slate-400">
          Toque para simular depósito
        </span>
      )}
    </div>
  );
};
