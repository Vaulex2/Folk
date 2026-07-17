"use client";

// Last-resort boundary: replaces the root layout, so no i18n context, no CSS
// imports — self-contained trilingual fallback (en/uz/ru), per Next.js guidance
// to keep global-error dependency-free.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong · Xatolik yuz berdi · Что-то пошло не так</h1>
          {error.digest && (
            <p style={{ color: "#777", fontSize: 13 }}>
              Error code: <code>{error.digest}</code>
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{ padding: "8px 20px", borderRadius: 999, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            Try again · Qayta urinish · Повторить
          </button>
        </div>
      </body>
    </html>
  );
}
