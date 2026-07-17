"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setMatingStatus } from "@/app/actions";
import type { MatingStatus } from "@/lib/sheep";
import { useI18n } from "@/components/I18nProvider";

export interface MatingRow {
  id: number;
  status: MatingStatus;
  eweId: number;
  eweTag: string;
  ramTag: string;
  matingDateLabel: string;
  dueDateLabel: string;
}

const STATUS_PILL: Record<MatingStatus, { bg: string; fg: string }> = {
  Planned: { bg: "var(--color-neutral-300)", fg: "var(--color-neutral-800)" },
  Confirmed: { bg: "var(--color-accent-2-300)", fg: "var(--color-accent-2-900)" },
  Lambed: { bg: "var(--color-accent-2-100)", fg: "var(--color-accent-2-800)" },
  Failed: { bg: "var(--color-accent-200)", fg: "var(--color-accent-800)" },
};

export default function MatingsList({ rows }: { rows: MatingRow[] }) {
  const { t, m } = useI18n();
  const [pending, start] = useTransition();
  const router = useRouter();

  function change(id: number, status: MatingStatus) {
    start(async () => {
      await setMatingStatus(id, status);
      router.refresh();
    });
  }

  return (
    <>
      <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>
        {t("breeding.matingsTitle")}{" "}
        <span style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
          ({rows.length})
        </span>
      </h2>
      <div className="panel">
        {rows.length === 0 && <div className="empty">{t("breeding.noMatings")}</div>}
        {rows.map((r) => {
          const pill = STATUS_PILL[r.status];
          return (
            <div key={r.id} className="mating-row">
              <div className="mating-pair">
                <span className="mating-tag">{r.eweTag}</span>
                <span style={{ color: "var(--muted)" }}>×</span>
                <span className="mating-tag">{r.ramTag}</span>
              </div>
              <div className="mating-dates">
                <span>{r.matingDateLabel}</span>
                <span style={{ color: "var(--muted)" }}>
                  → {t("breeding.dueLabel")} {r.dueDateLabel}
                </span>
              </div>
              <span className="tag" style={{ background: pill.bg, color: pill.fg }}>
                {m.matingStatus[r.status]}
              </span>
              <div className="mating-actions">
                {r.status === "Planned" && (
                  <>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={pending}
                      onClick={() => change(r.id, "Confirmed")}
                    >
                      {t("breeding.confirm")}
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={pending}
                      onClick={() => change(r.id, "Failed")}
                    >
                      {t("breeding.markFailed")}
                    </button>
                  </>
                )}
                {r.status === "Confirmed" && (
                  <>
                    <Link className="btn btn-primary" href={`/breeding/lambing/${r.id}`}>
                      {t("detail.recordLambing")}
                    </Link>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={pending}
                      onClick={() => change(r.id, "Failed")}
                    >
                      {t("breeding.markFailed")}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
