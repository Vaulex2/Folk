// Lucide-style inline icons at stroke-width 2.75, per the Organic design system.
type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2.75, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconDash = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconList = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const IconAdd = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
);
export const IconTree = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="5" r="2.4" /><circle cx="6" cy="19" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="M12 7.4v3.6M12 11h-6v5.6M12 11h6v5.6" /></svg>
);
export const IconHeart = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3.2 1.2 4 2.5C10.8 6.2 12 5 14 5c3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20Z" /></svg>
);
export const IconSheep = ({ size = 19 }: P) => (
  <svg {...base(size)}><path d="M12 3c-2 0-3.2 1.3-3.2 3 0 .5-.5.8-1 .8C6.2 6.8 5 8 5 9.6c0 1 .5 1.7 1.2 2.1-.7.5-1.2 1.3-1.2 2.3C5 16 6.3 17 8 17h8c1.7 0 3-1 3-3 0-1-.5-1.8-1.2-2.3.7-.4 1.2-1.1 1.2-2.1 0-1.6-1.2-2.8-2.8-2.8-.5 0-1-.3-1-.8C15.2 4.3 14 3 12 3Z" /><path d="M9 17v2M15 17v2" /></svg>
);
export const IconTasks = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
);
export const IconMoney = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6.2 12h.01M17.8 12h.01" /></svg>
);
export const IconHistory = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" /><path d="M3.5 3.5v5h5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconChevR = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="m9 6 6 6-6 6" /></svg>
);
export const IconChevL = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="m15 18-6-6 6-6" /></svg>
);
export const IconPlus = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconEdit = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const IconMail = ({ size = 17 }: P) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
);
export const IconLock = ({ size = 17 }: P) => (
  <svg {...base(size)}><rect x="4" y="11" width="16" height="9" rx="2.5" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></svg>
);
export const IconEye = ({ size = 17 }: P) => (
  <svg {...base(size)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconEyeOff = ({ size = 17 }: P) => (
  <svg {...base(size)}><path d="M10.6 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a14 14 0 0 1-2.3 3M6.3 6.3A14 14 0 0 0 2 12s3.6 7 10 7a9.5 9.5 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="m3 3 18 18" /></svg>
);
export const IconArrowR = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M5 12h13M12 6l6 6-6 6" /></svg>
);
