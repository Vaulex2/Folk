import { healthColors } from "@/lib/sheep";

export default function HealthPill({
  health,
  label,
  className = "node-hs",
  style,
}: {
  health: string; // canonical status — drives the color
  label?: string; // localized text; defaults to the canonical status
  className?: string;
  style?: React.CSSProperties;
}) {
  const hs = healthColors(health);
  return (
    <span className={className} style={{ background: hs.bg, color: hs.fg, ...style }}>
      {label ?? health}
    </span>
  );
}
