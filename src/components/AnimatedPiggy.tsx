import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AnimatedPiggyProps {
  progress?: number; // 0 to 100
  size?: number; // e.g. 180, 200, 240
  isHappy?: boolean;
  interactive?: boolean;
  onCoinDrop?: () => void;
}

export const AnimatedPiggy: React.FC<AnimatedPiggyProps> = ({
  progress = 50,
  size = 180,
  isHappy = true,
  interactive = true,
  onCoinDrop
}) => {
  const [coins, setCoins] = useState<{ id: number; x: number }[]>([]);
  const [isWiggling, setIsWiggling] = useState(false);

  const cappedProgress = Math.min(100, Math.max(0, progress));
  const isCompleted = cappedProgress >= 100;

  const triggerCoinDrop = () => {
    if (!interactive) return;
    const newCoin = { id: Date.now() + Math.random(), x: (Math.random() - 0.5) * 20 };
    setCoins(prev => [...prev.slice(-4), newCoin]);
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 600);
    if (onCoinDrop) onCoinDrop();
  };

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      onClick={triggerCoinDrop}
      title={interactive ? "Clique para jogar uma moeda no cofrinho!" : undefined}
    >
      {/* Background Soft Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-2xl opacity-40 transition-all duration-700 pointer-events-none"
        style={{
          background: isCompleted 
            ? "radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(245,158,11,0.2) 70%, transparent 100%)"
            : "radial-gradient(circle, rgba(244,114,182,0.4) 0%, rgba(16,185,129,0.2) 70%, transparent 100%)"
        }}
      />

      {/* Floating Animated Coins Falling into Slot */}
      <AnimatePresence>
        {coins.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 1, y: -60, x: c.x, scale: 0.9, rotate: -25 }}
            animate={{ opacity: [1, 1, 0], y: 15, scale: [0.9, 1.1, 0.4], rotate: 180 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="absolute top-2 z-30 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-200 shadow-lg border-2 border-amber-600 flex items-center justify-center font-black text-amber-900 text-xs">
              R$
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Piggy Body with Wiggle and Hover Float */}
      <motion.div
        animate={{
          y: isWiggling ? [0, -6, 2, -3, 0] : [0, -4, 0],
          rotate: isWiggling ? [0, -4, 4, -2, 0] : 0,
          scale: isWiggling ? [1, 1.05, 0.98, 1] : 1
        }}
        transition={{
          y: { repeat: isWiggling ? 0 : Infinity, duration: 3.5, ease: "easeInOut" },
          rotate: { duration: 0.5 },
          scale: { duration: 0.5 }
        }}
        className="relative z-10 cursor-pointer"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 240 240" 
          className="w-full h-full drop-shadow-2xl"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pig Body Gradients */}
            <linearGradient id="pigBodyGrad" x1="40" y1="30" x2="200" y2="210" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDA4AF" /> {/* Rose-300 */}
              <stop offset="45%" stopColor="#FB7185" /> {/* Rose-400 */}
              <stop offset="100%" stopColor="#E11D48" /> {/* Rose-600 */}
            </linearGradient>

            <linearGradient id="pigBellyFill" x1="0" y1="200" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            <linearGradient id="pigEarGrad" x1="0" y1="0" x2="30" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FECDD3" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>

            <linearGradient id="snoutGrad" x1="120" y1="120" x2="120" y2="175" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FECDD3" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>

            <linearGradient id="coinSlotGrad" x1="100" y1="48" x2="140" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#881337" />
              <stop offset="100%" stopColor="#4C0519" />
            </linearGradient>

            <radialGradient id="cheekGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
            </radialGradient>

            {/* Clipping Mask for Progress Belly */}
            <clipPath id="pigBodyClip">
              <ellipse cx="120" cy="130" rx="82" ry="68" />
            </clipPath>
          </defs>

          {/* Shadow underneath */}
          <ellipse cx="120" cy="216" rx="65" ry="12" fill="#0F172A" fillOpacity="0.12" />

          {/* Left Ear */}
          <motion.path
            d="M 68 85 C 50 45, 78 28, 92 56 Z"
            fill="url(#pigEarGrad)"
            stroke="#BE123C"
            strokeWidth="3.5"
            strokeLinejoin="round"
            animate={{ rotate: isWiggling ? [-6, 6, -3, 0] : [0, -3, 0] }}
            style={{ transformOrigin: "80px 75px" }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
          {/* Inner Left Ear */}
          <path d="M 72 75 C 60 52, 78 42, 85 60 Z" fill="#FFE4E6" opacity="0.8" />

          {/* Right Ear */}
          <motion.path
            d="M 172 85 C 190 45, 162 28, 148 56 Z"
            fill="url(#pigEarGrad)"
            stroke="#BE123C"
            strokeWidth="3.5"
            strokeLinejoin="round"
            animate={{ rotate: isWiggling ? [6, -6, 3, 0] : [0, 3, 0] }}
            style={{ transformOrigin: "160px 75px" }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          />
          {/* Inner Right Ear */}
          <path d="M 168 75 C 180 52, 162 42, 155 60 Z" fill="#FFE4E6" opacity="0.8" />

          {/* Feet Back */}
          <rect x="74" y="180" width="22" height="26" rx="10" fill="#E11D48" stroke="#9F1239" strokeWidth="3" />
          <rect x="144" y="180" width="22" height="26" rx="10" fill="#E11D48" stroke="#9F1239" strokeWidth="3" />

          {/* Main Pig Body */}
          <ellipse cx="120" cy="130" rx="82" ry="68" fill="url(#pigBodyGrad)" stroke="#BE123C" strokeWidth="4" />

          {/* Translucent Belly Fill Indicator (According to progress %) */}
          <g clipPath="url(#pigBodyClip)">
            {/* Water/Gold Level in belly */}
            <rect 
              x="30" 
              y={198 - (cappedProgress * 1.36)} 
              width="180" 
              height="150" 
              fill={isCompleted ? "url(#pigBellyFill)" : "rgba(16, 185, 129, 0.45)"}
              className="transition-all duration-700 ease-out"
            />
            {/* Liquid wave surface highlight */}
            <ellipse 
              cx="120" 
              cy={198 - (cappedProgress * 1.36)} 
              rx="75" 
              ry="6" 
              fill={isCompleted ? "#6EE7B7" : "rgba(255, 255, 255, 0.6)"}
              className="transition-all duration-700 ease-out"
            />
          </g>

          {/* Cute Curly Tail */}
          <path
            d="M 40 135 C 28 132, 22 120, 28 112 C 34 104, 40 114, 34 122 C 30 126, 38 128, 42 134"
            fill="none"
            stroke="#BE123C"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Feet Front */}
          <rect x="86" y="186" width="22" height="24" rx="10" fill="#FDA4AF" stroke="#BE123C" strokeWidth="3" />
          <rect x="132" y="186" width="22" height="24" rx="10" fill="#FDA4AF" stroke="#BE123C" strokeWidth="3" />

          {/* Coin Slot on top */}
          <rect x="104" y="66" width="32" height="6" rx="3" fill="url(#coinSlotGrad)" stroke="#881337" strokeWidth="1.5" />
          <ellipse cx="120" cy="69" rx="14" ry="1.5" fill="#FDA4AF" opacity="0.3" />

          {/* Cheeks Glow */}
          <ellipse cx="76" cy="142" rx="12" ry="8" fill="url(#cheekGlow)" />
          <ellipse cx="164" cy="142" rx="12" ry="8" fill="url(#cheekGlow)" />

          {/* Eyes (Blinking Animation) */}
          <g>
            {/* Left Eye */}
            <motion.ellipse 
              cx="86" 
              cy="114" 
              rx="6" 
              ry="8" 
              fill="#0F172A" 
              animate={{ scaleY: [1, 1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4.5, times: [0, 0.94, 0.96, 1] }}
            />
            <circle cx="88" cy="111" r="2.5" fill="#FFFFFF" />
            <circle cx="84" cy="116" r="1.2" fill="#FFFFFF" />

            {/* Right Eye */}
            <motion.ellipse 
              cx="154" 
              cy="114" 
              rx="6" 
              ry="8" 
              fill="#0F172A"
              animate={{ scaleY: [1, 1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4.5, times: [0, 0.94, 0.96, 1] }}
            />
            <circle cx="156" cy="111" r="2.5" fill="#FFFFFF" />
            <circle cx="152" cy="116" r="1.2" fill="#FFFFFF" />
          </g>

          {/* Snout */}
          <ellipse cx="120" cy="144" rx="28" ry="20" fill="url(#snoutGrad)" stroke="#BE123C" strokeWidth="3.5" />
          {/* Nostrils */}
          <ellipse cx="112" cy="144" rx="4.5" ry="6.5" fill="#881337" />
          <ellipse cx="128" cy="144" rx="4.5" ry="6.5" fill="#881337" />
          {/* Snout Shine */}
          <ellipse cx="120" cy="132" rx="14" ry="4" fill="#FFFFFF" opacity="0.4" />

          {/* Shiny Body Highlight */}
          <path
            d="M 68 100 C 85 80, 155 80, 172 100"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>

        {/* Celebration Stars when Completed */}
        {isCompleted && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: [0.8, 1.1, 1], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 p-1.5 rounded-full shadow-lg border border-yellow-200"
          >
            <Sparkles size={18} />
          </motion.div>
        )}
      </motion.div>

      {/* Interactive Helper Cue */}
      {interactive && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
          Toque para poupar 🪙
        </div>
      )}
    </div>
  );
};
