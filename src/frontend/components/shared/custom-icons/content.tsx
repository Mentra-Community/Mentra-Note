import type { IconProps } from "./types";

export function FavoriteIcon({
  size = 22,
  stroke = "#1C1917",
  strokeWidth = 1.75,
  fill = "none",
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} {...rest}>
      <path d="M12 2l2.09 6.26L20.18 9l-4.91 3.74L17.18 19 12 15.27 6.82 19l1.91-6.26L3.82 9l6.09-.74z" stroke={stroke} strokeWidth={strokeWidth} fill="none" />
    </svg>
  );
}

export function FavoriteStarIcon({
  size = 18,
  stroke = "currentColor",
  strokeWidth = 2,
  fill = "none",
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
    </svg>
  );
}

export function ArchiveIcon({
  size = 18,
  stroke = "currentColor",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M21 8v13H3V8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1" y="3" width="22" height="5" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderPlusIcon({
  size = 20,
  stroke = "#1C1917",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="11" x2="12" y2="17" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="9" y1="14" x2="15" y2="14" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function DocumentPlusIcon({
  size = 20,
  stroke = "#1C1917",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="11" x2="12" y2="17" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="9" y1="14" x2="15" y2="14" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function FolderIcon({
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

export function ConversationIcon({
  size = 14,
  stroke = "#A8A29E",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function PauseIcon({
  size = 14,
  stroke = "#3D3832",
  strokeWidth = 2.5,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function StopRecordingIcon({
  size = 18,
  fill = "#FFFFFF",
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} {...rest}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  );
}

export function SparkleIcon({
  size = 18,
  stroke = "#EF4444",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

export function WarningTriangleIcon({
  size = 28,
  stroke = "#DC2626",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function UserIcon({
  size = 18,
  stroke = "#A8A29E",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function CalendarGridIcon({
  size = 18,
  stroke = "#A8A29E",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth={strokeWidth} />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function ClockIcon({
  size = 16,
  stroke = "#B0AAA2",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 15 14" />
    </svg>
  );
}

export function DocumentPageIcon({
  size = 18,
  stroke = "currentColor",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
