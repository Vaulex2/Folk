// Decorative pasture along the bottom of the sign-in scene: two rolling hills
// and a scatter of grazing sheep. Each body is a union of overlapping circles,
// echoing the scalloped wool outline of the brand mark.
//
// The sheep are quietly alive: grazers nibble and occasionally look up,
// standers dip down for a mouthful, and everyone drifts a few pixels as they
// feed. Positioning lives in the attribute transform; the animated wander and
// head-bob live on nested groups so CSS transforms never fight the layout
// (a CSS transform would override the attribute transform on the same node).

type SheepKind = "stand" | "graze" | "lie";

function Head({ kind }: { kind: SheepKind }) {
  if (kind === "graze") {
    return (
      <g className="ps-h">
        <circle cx="16.5" cy="7" r="5" />
        <ellipse cx="20" cy="4.5" rx="2.6" ry="1.5" transform="rotate(-30 20 4.5)" />
      </g>
    );
  }
  if (kind === "lie") {
    return (
      <g className="ps-h">
        <circle cx="15.5" cy="-2.5" r="5" />
        <ellipse cx="19.5" cy="-5" rx="2.8" ry="1.6" transform="rotate(28 19.5 -5)" />
      </g>
    );
  }
  return (
    <g className="ps-h">
      <circle cx="16" cy="-8" r="5.2" />
      <ellipse cx="20.5" cy="-10.5" rx="2.8" ry="1.6" transform="rotate(28 20.5 -10.5)" />
    </g>
  );
}

function Sheep({
  kind,
  x,
  y,
  s = 1,
  flip = false,
  headDur = 7,
  headDelay = 0,
  wanderDur = 26,
  wanderDelay = 0,
}: {
  kind: SheepKind;
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  headDur?: number;
  headDelay?: number;
  wanderDur?: number;
  wanderDelay?: number;
}) {
  const vars = {
    "--hd": `${headDur}s`,
    "--hdel": `${headDelay}s`,
    "--wd": `${wanderDur}s`,
    "--wdel": `${wanderDelay}s`,
  } as React.CSSProperties;

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} className={`ps-${kind}`} style={vars}>
      <g className="ps-w">
        {kind === "lie" ? (
          <>
            <circle cx="-8" cy="4" r="7.5" />
            <circle cx="0" cy="1" r="8.5" />
            <circle cx="8" cy="4" r="7.5" />
            <ellipse cx="0" cy="9" rx="16" ry="3" />
          </>
        ) : (
          <>
            <rect x="-11" y="6" width="3.6" height="10" rx="1.8" />
            <rect x="6" y="6" width="3.6" height="10" rx="1.8" />
            <circle cx="-8" cy="1" r="8.5" />
            <circle cx="0" cy="-3.5" r="9.5" />
            <circle cx="8" cy="0.5" r="8.5" />
            <circle cx="0" cy="3" r="9" />
          </>
        )}
        <Head kind={kind} />
      </g>
    </g>
  );
}

export default function PastureBackdrop({ variant = "signin" }: { variant?: "signin" | "app" }) {
  return (
    <svg
      className={`signin-pasture${variant === "app" ? " app-pasture" : ""}`}
      viewBox="0 0 1440 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {/* far hill */}
      <path
        d="M0 190 C 220 120, 460 150, 700 165 C 940 180, 1160 120, 1440 170 L 1440 300 L 0 300 Z"
        fill="var(--color-accent-2-200)"
        opacity="0.6"
      />
      {/* near hill */}
      <path
        d="M0 250 C 260 200, 520 235, 780 232 C 1040 229, 1240 195, 1440 235 L 1440 300 L 0 300 Z"
        fill="var(--color-accent-200)"
        opacity="0.7"
      />

      {/* far flock — smaller, lighter */}
      <g fill="var(--color-neutral-600)" opacity="0.4">
        <Sheep kind="graze" x={180} y={168} s={0.9} headDur={6.5} headDelay={1.2} wanderDur={30} />
        <Sheep kind="stand" x={310} y={156} s={0.8} flip headDur={9} headDelay={4} wanderDur={34} wanderDelay={6} />
        <Sheep kind="lie" x={1010} y={155} s={0.85} />
        <Sheep kind="graze" x={1180} y={166} s={0.95} flip headDur={7.5} headDelay={2.6} wanderDur={28} wanderDelay={3} />
      </g>

      {/* near flock — bigger, a touch darker */}
      <g fill="var(--color-neutral-700)" opacity="0.5">
        <Sheep kind="stand" x={120} y={240} s={1.4} headDur={8.5} headDelay={2} wanderDur={26} />
        <Sheep kind="graze" x={350} y={250} s={1.6} headDur={6} headDelay={0.4} wanderDur={32} wanderDelay={5} />
        <Sheep kind="lie" x={580} y={248} s={1.35} flip />
        <Sheep kind="graze" x={1070} y={248} s={1.5} flip headDur={7} headDelay={3.4} wanderDur={29} wanderDelay={8} />
        <Sheep kind="stand" x={1300} y={240} s={1.3} headDur={9.5} headDelay={5.5} wanderDur={36} wanderDelay={2} />
      </g>
    </svg>
  );
}
