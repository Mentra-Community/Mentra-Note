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
      viewBox="20 30 360 160"
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
        d="M 36,158 C 36,148 38,128 42,110 C 46,92 52,76 60,68 C 66,62 72,64 74,72 C 76,80 74,96 74,112 C 74,126 74,140 74,154 C 74,140 80,120 90,106 C 100,92 114,82 126,82 C 134,82 138,90 138,102 C 138,114 136,132 134,148 C 133,154 133,158 133,158"
      />
      {/* o */}
      <path
        id="o1"
        className="splash-stroke"
        strokeWidth="4.0"
        d="M 133,158 C 136,142 144,126 156,118 C 168,110 180,112 186,122 C 192,132 190,150 182,162 C 174,174 162,178 152,174 C 142,170 136,160 136,148 C 136,140 142,134 150,134"
      />
      {/* t stem */}
      <path
        id="t1"
        className="splash-stroke"
        strokeWidth="3.6"
        d="M 206,46 C 206,62 204,84 202,106 C 200,126 198,146 198,158 C 198,164 200,170 204,170 C 208,170 214,164 220,156"
      />
      {/* t crossbar */}
      <path
        id="t2"
        className="splash-stroke"
        strokeWidth="2.4"
        d="M 188,112 C 196,110 206,108 220,109"
      />
      {/* e */}
      <path
        id="e1"
        className="splash-stroke"
        strokeWidth="4.0"
        d="M 236,138 C 240,132 248,128 258,128 C 268,128 276,132 278,138 C 280,144 276,150 268,154 C 258,158 246,156 240,148 C 236,142 236,134 242,126 C 248,118 258,114 268,116 C 276,118 280,124 280,132"
      />
      {/* s upper */}
      <path
        id="s1"
        className="splash-stroke"
        strokeWidth="3.8"
        d="M 320,108 C 314,98 304,94 296,100 C 288,106 290,118 300,126 C 310,134 322,136 326,144 C 330,152 324,162 314,166 C 304,170 292,166 286,158 C 282,152 284,146 288,144"
      />
      {/* s exit flourish */}
      <path
        id="s2"
        className="splash-stroke"
        strokeWidth="2.0"
        d="M 288,158 C 300,172 322,174 342,168 C 354,164 360,156 360,150"
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
          <div className="flex flex-col justify-center items-center -mt-[15px]">
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
