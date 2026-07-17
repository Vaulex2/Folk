// One skeleton for every data page — they all await the same cached flock read.
export default function Loading() {
  return (
    <div aria-busy="true" style={{ display: "grid", gap: 14 }}>
      {[64, 220, 220].map((h, i) => (
        <div
          key={i}
          className="panel"
          style={{ height: h, animation: "pulse 1.2s ease-in-out infinite", opacity: 0.55 }}
        />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity:.35 } 50% { opacity:.65 } }`}</style>
    </div>
  );
}
