// Server error hook (Next.js 16). Logs one JSON line per uncaught request error;
// the digest matches the "Error code" shown by app/error.tsx, so a user-reported
// code can be found in the logs. This is where a Sentry call would slot in.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string }
) {
  const e = err as (Error & { digest?: string }) | undefined;
  console.error(
    JSON.stringify({
      level: "error",
      ts: new Date().toISOString(),
      scope: "request",
      digest: e?.digest,
      message: e?.message ?? String(err),
      path: request.path,
      method: request.method,
      routeType: context.routeType,
    })
  );
}
