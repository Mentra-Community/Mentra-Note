import type { IconProps } from "./types";

export function MenuListIcon({
  size = 16,
  stroke = "#78716C",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <line x1="3" y1="6" x2="21" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function GridIcon({
  size = 16,
  stroke = "#FAFAF9",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function MergeIcon({
  size = 22,
  stroke = "#1C1917",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M8 6l4 4 4-4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="22" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function MoveFolderIcon({
  size = 22,
  stroke = "#1C1917",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MoreVerticalIcon({
  size = 20,
  fill = "#52525B",
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle cx="12" cy="6" r="1.5" fill={fill} />
      <circle cx="12" cy="12" r="1.5" fill={fill} />
      <circle cx="12" cy="18" r="1.5" fill={fill} />
    </svg>
  );
}

export function MicrophoneOffIcon({
  size = 9,
  stroke = "#A8A29E",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
