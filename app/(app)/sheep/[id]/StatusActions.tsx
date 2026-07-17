"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setSheepStatus } from "@/app/actions";
import type { SheepStatus } from "@/lib/sheep";
import { IconEdit, IconTree } from "@/components/icons";
import { useT } from "@/components/I18nProvider";

export default function StatusActions({ id, status }: { id: number; status: SheepStatus }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT();

  function change(next: SheepStatus) {
    start(async () => {
      await setSheepStatus(id, next);
      router.refresh();
    });
  }

  return (
    <div className="form-actions" style={{ marginTop: 16 }}>
      <Link className="btn btn-secondary" href={`/tree?focus=${id}`}>
        <IconTree size={16} />{t("detail.viewInTree")}
      </Link>
      <Link className="btn btn-secondary" href={`/sheep/${id}/edit`}>
        <IconEdit />{t("detail.edit")}
      </Link>
      {status === "Active" ? (
        <>
          <button className="btn btn-danger" type="button" disabled={pending} onClick={() => change("Sold")}>
            {t("detail.markSold")}
          </button>
          <button className="btn btn-danger" type="button" disabled={pending} onClick={() => change("Died")}>
            {t("detail.markDied")}
          </button>
        </>
      ) : (
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => change("Active")}>
          {t("detail.restore")}
        </button>
      )}
    </div>
  );
}
