import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "stroke" | "fill"> {
  size?: number | string;
  stroke?: string;
  strokeWidth?: number | string;
  fill?: string;
  className?: string;
}
