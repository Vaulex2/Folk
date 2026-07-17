import "server-only";

// Minimal structured logger: one JSON line per event so host log drains
// (Vercel, etc.) can parse and filter. Swap the sink here to adopt Sentry later.
export function logError(scope: string, err: unknown, ctx?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      ts: new Date().toISOString(),
      scope,
      message,
      ...(stack ? { stack } : {}),
      ...(ctx ?? {}),
    })
  );
}
