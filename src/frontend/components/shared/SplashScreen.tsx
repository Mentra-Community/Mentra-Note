/**
 * SplashScreen - Loading splash with dotted gradient pattern
 *
 * Shows a full-screen light gradient with a grid of subtle dots.
 * Supports a smooth fade-out transition via the `fadeOut` prop.
 */

import { motion, AnimatePresence } from "framer-motion";
import logoSrc from "../../assets/mentra_notes.png";

interface SplashScreenProps {
  visible?: boolean;
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
          {/* Gradient background - very light */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, #f0f0f2 0%, #f7f7f8 25%, #fbfbfc 50%, #ffffff 100%)",
            }}
          />

          {/* Dot grid overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle, #a1a1aa 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Centered logo */}
          <motion.img
            src={logoSrc}
            alt="Mentra Notes"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 w-56"
          />

          {/* Version */}
          <span className="absolute bottom-8 z-10 text-xs text-zinc-400">
            v2.0.0
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
