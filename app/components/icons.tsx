import type { ReactNode } from "react";

/** Small stroke icons shared across the landing page, header and booking UI. */

type IconProps = { className?: string };

function Svg({
  className = "h-4 w-4",
  strokeWidth = 2.2,
  children,
}: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-none ${className}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const CalendarIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);

export const ChatIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
  </Svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <Svg className={className} strokeWidth={2.8}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const InfoIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

export const ArrowIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Svg className={className} strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

const CHEVRON = { left: "m15 18-6-6 6-6", right: "m9 18 6-6-6-6", down: "m6 9 6 6 6-6" };

export const ChevronIcon = ({ className, dir }: IconProps & { dir: keyof typeof CHEVRON }) => (
  <Svg className={className} strokeWidth={2.4}>
    <path d={CHEVRON[dir]} />
  </Svg>
);
