"use client";
import { useEffect } from "react";
import { useT } from "@/components/I18nProvider";

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // The server logs full details via onRequestError (instrumentation.ts);
    // this client log carries the digest for correlating the two.
    console.error("[flock] page error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="pagehead" style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
      <h1>{t("errors.title")}</h1>
      <p>{t("errors.body")}</p>
      {error.digest && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          {t("errors.digest")}: <code>{error.digest}</code>
        </p>
      )}
      <button className="btn btn-primary" onClick={() => unstable_retry()} style={{ marginTop: 12 }}>
        {t("errors.retry")}
      </button>
    </div>
  );
}
