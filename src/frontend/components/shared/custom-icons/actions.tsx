import type { IconProps } from "./types";

export function CloseIcon({
  size = 20,
  stroke = "#78716C",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <line x1="18" y1="6" x2="6" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({
  size = 20,
  stroke = "#6B655D",
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function ExportIcon({
  size = 20,
  stroke = "#6B655D",
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export function EmailIcon({
  size = 16,
  stroke = "#52525B",
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function CopyIcon({
  size = 16,
  stroke = "#52525B",
  strokeWidth = 1.8,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function PlusIcon({
  size = 16,
  stroke = "#A8A29E",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CheckIcon({
  size = 16,
  stroke = "#2563EB",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ClipboardPlusIcon({
  size = 22,
  stroke = "#78716C",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="M8 12h8M12 8v8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function CircularSpinnerIcon({
  size = 14,
  strokeWidth = 3,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle cx="12" cy="12" r="10" stroke="#D6D3D1" strokeWidth={strokeWidth} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#A8A29E" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function XCircleIcon({
  size = 16,
  stroke = "#DC2626",
  strokeWidth = 2,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function EmailEnvelopeIcon({
  size = 22,
  stroke = "#78716C",
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={stroke} strokeWidth={strokeWidth} />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
