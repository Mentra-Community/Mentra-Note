/**
 * TranscribingIndicator - Animated indicator for active transcription
 *
 * Features:
 * - Animated SVG waveform bars (3 bars with staggered animation)
 * - Shimmer text effect on "Transcribing..."
 * - Compact and inline variants
 *
 * Reference: figma-design/src/app/views/FolderList.tsx L91-110
 */

import { clsx } from "clsx";

interface TranscribingIndicatorProps {
  /** Show text label alongside bars */
  showLabel?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional className */
  className?: string;
}

export function TranscribingIndicator({
  showLabel = true,
  size = "md",
  className,
}: TranscribingIndicatorProps) {
  const barSize = size === "sm" ? "w-[2px]" : "w-[2.8px]";
  const svgSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={clsx("flex items-center gap-1.5", className)}>
      {/* Animated SVG Waveform Bars */}
      <svg
        viewBox="0 0 16 24"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(svgSize, "text-red-500 fill-current")}
      >
        {/* Bar 1 */}
        <rect x="1" y="6" width="2.8" height="12" rx="1">
          <animate
            attributeName="y"
            begin="0s"
            dur="1s"
            values="6;1;6"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            begin="0s"
            dur="1s"
            values="12;22;12"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
        </rect>

        {/* Bar 2 */}
        <rect x="6.5" y="6" width="2.8" height="12" rx="1">
          <animate
            attributeName="y"
            begin="0.2s"
            dur="1s"
            values="6;1;6"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            begin="0.2s"
            dur="1s"
            values="12;22;12"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
        </rect>

        {/* Bar 3 */}
        <rect x="12" y="6" width="2.8" height="12" rx="1">
          <animate
            attributeName="y"
            begin="0.4s"
            dur="1s"
            values="6;1;6"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="height"
            begin="0.4s"
            dur="1s"
            values="12;22;12"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            repeatCount="indefinite"
          />
        </rect>
      </svg>

      {/* Shimmer Text */}
      {showLabel && (
        <span
          className={clsx(
            textSize,
            "font-bold bg-gradient-to-r from-red-600 via-red-400 to-red-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer"
          )}
        >
          Transcribing...
        </span>
      )}
    </div>
  );
}
