// Concrete design tokens for the native app. The web app expresses its palette
// as CSS custom properties (an "Organic" farm-green ramp); React Native needs
// plain color values, so we fix them here. Kept in one place so screens never
// hard-code a hex value.

import type { HealthStatus } from "./core";

export const colors = {
  bg: "#F4F1E9", // warm paper
  surface: "#FFFFFF",
  surfaceAlt: "#FBFAF5",
  border: "#E4DFD1",
  borderStrong: "#D2CCBA",
  text: "#2B2A24",
  textMuted: "#6E6A5C",
  textFaint: "#9A9484",
  primary: "#3C6E47", // farm green
  primaryDark: "#2E5638",
  primarySoft: "#E6EFE6",
  danger: "#B4463B",
  dangerSoft: "#F7E7E4",
  warning: "#C8842A",
  income: "#3C6E47",
  expense: "#B4463B",
  overlay: "rgba(30,29,24,0.45)",
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const font = {
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

// Health-status pill colors — the RN equivalent of lib/sheep.ts `HEALTH`
// (which returns CSS var() strings unusable here).
export const healthPill: Record<HealthStatus, { bg: string; fg: string }> = {
  Healthy: { bg: "#E2EFE0", fg: "#2E5638" },
  "Needs attention": { bg: "#FBEAD0", fg: "#8A5A16" },
  "Under treatment": { bg: "#F7E0D9", fg: "#8F3A2E" },
  Pregnant: { bg: "#E4E8F5", fg: "#3A4A82" },
  "Vaccination due": { bg: "#ECE9DE", fg: "#5F5A48" },
};

export function healthPillColors(h: HealthStatus) {
  return healthPill[h] ?? healthPill.Healthy;
}
