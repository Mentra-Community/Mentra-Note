/**
 * SplashScreen - Hand-drawn cursive "notes" animation
 *
 * Shows a full-screen light gradient with a hand-drawn SVG animation
 * that writes "notes" in cursive, stroke by stroke.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  visible?: boolean;
}

// Stroke definitions: [id, strokeWidth, duration(ms), startDelay(ms)]
const STROKES: [string, number, number, number][] = [
  ["n1", 4.2, 320, 100],
  ["o1", 4.0, 280, 380],
  ["t1", 3.6, 220, 600],
  ["t2", 2.4, 100, 780],
  ["e1", 4.0, 260, 850],
  ["s1", 3.8, 240, 1060],
  ["s2", 2.0, 140, 1260],
];

function getLen(el: SVGPathElement): number {
  try {
    return Math.ceil(el.getTotalLength()) + 10;
  } catch {
    return 900;
  }
}

function NotesAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    STROKES.forEach(([id, sw, dur, delay]) => {
      const el = svg.getElementById(id) as SVGPathElement | null;
      if (!el) return;
      const len = getLen(el);

      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.strokeWidth = sw + "px";
      el.style.strokeDasharray = len + "px";
      el.style.strokeDashoffset = len + "px";

      setTimeout(() => {
        el.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(0.38,0,0.18,1)`;
        el.style.strokeDashoffset = "0";
      }, delay);
    });
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="20 26 358 168"
      xmlns="http://www.w3.org/2000/svg"
      className="z-10 "
      width="200"
      height="94"
    >
      {/* n */}
      <path
        id="n1"
        className="splash-stroke"
        strokeWidth="4.2"
        d="M 26,152 C 27,138 30,118 36,100 C 42,82 50,66 60,60 C 68,55 76,58 80,68 C 84,78 82,98 80,116 C 78,130 76,144 76,153 C 76,143 79,126 85,110 C 91,92 101,74 113,68 C 122,63 132,66 136,78 C 140,90 138,112 136,132 C 134,144 133,153 133,158"
      />
      {/* o */}
      <path
        id="o1"
        className="splash-stroke"
        strokeWidth="4.0"
        d="M 133,150 C 138,140 148,132 160,128 C 172,124 184,126 190,136 C 196,146 194,162 186,172 C 178,182 164,186 152,182 C 140,178 132,166 132,152 C 132,138 140,126 152,120 C 160,116 170,118 176,126"
      />
      {/* t stem */}
      <path
        id="t1"
        className="splash-stroke"
        strokeWidth="3.6"
        d="M 222,32 C 222,50 220,74 217,98 C 214,120 211,142 210,158 C 209,164 210,170 214,172 C 218,173 225,169 230,162"
      />
      {/* t crossbar */}
      <path
        id="t2"
        className="splash-stroke"
        strokeWidth="2.4"
        d="M 200,104 C 208,101 218,99 234,100"
      />
      {/* e */}
      <path
        id="e1"
        className="splash-stroke"
        strokeWidth="4.0"
        d="M 265,126 C 258,124 248,118 244,108 C 240,98 244,86 254,80 C 264,74 278,78 284,90 C 290,102 286,118 276,128 C 266,138 252,140 244,132 C 238,126 238,116 246,112 C 254,108 264,110 268,118"
      />
      {/* s upper */}
      <path
        id="s1"
        className="splash-stroke"
        strokeWidth="3.8"
        d="M 336,88 C 328,76 314,72 304,80 C 294,88 296,102 308,110 C 320,118 334,120 340,130 C 346,140 340,154 326,160 C 312,166 296,160 290,150 C 287,144 288,138 293,136"
      />
      {/* s exit flourish */}
      <path
        id="s2"
        className="splash-stroke"
        strokeWidth="2.0"
        d="M 293,150 C 306,166 330,170 352,163 C 365,158 372,150 372,144"
      />
    </svg>
  );
}

export function SplashScreen({ visible = true }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white"
        >
          {/* Hand-drawn cursive "notes" animation */}
          <div className="flex flex-col justify-center items-center">
            <NotesAnimation />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.4, ease: "easeOut" }}
              className="mt-[15px] text-[13px] font-light text-[#b3b3b3]"
            >
              Powered by Mentra
            </motion.div>
          </div>

          {/* Version */}
          <span className="absolute bottom-8 z-10 text-xs text-zinc-400">
            v2.0.0
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
