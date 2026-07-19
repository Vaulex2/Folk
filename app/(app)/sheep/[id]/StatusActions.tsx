"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setSheepStatus } from "@/app/actions";
import type { SheepStatus } from "@/lib/sheep";
import { IconEdit, IconTree } from "@/components/icons";
import { useT } from "@/components/I18nProvider";

export default function StatusActions({ id, status }: { id: number; status: SheepStatus }) {
  const [pending, start] = useTransition();
  const [selling, setSelling] = useState(false);
  const [price, setPrice] = useState("");
  const router = useRouter();
  const t = useT();

  function change(next: SheepStatus, salePrice?: number | null) {
    start(async () => {
      await setSheepStatus(id, next, salePrice);
      setSelling(false);
      setPrice("");
      router.refresh();
    });
  }

  function confirmSale() {
    const n = Number(price);
    change("Sold", price !== "" && Number.isFinite(n) && n >= 0 ? n : null);
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
        selling ? (
          <>
            <input
              className="input"
              type="number"
              min="0"
              step="any"
              style={{ maxWidth: 170 }}
              placeholder={t("money.salePricePrompt")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoFocus
            />
            <button className="btn btn-danger" type="button" disabled={pending} onClick={confirmSale}>
              {t("money.confirmSale")}
            </button>
            <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setSelling(false)}>
              {t("form.cancel")}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-danger" type="button" disabled={pending} onClick={() => setSelling(true)}>
              {t("detail.markSold")}
            </button>
            <button className="btn btn-danger" type="button" disabled={pending} onClick={() => change("Died")}>
              {t("detail.markDied")}
            </button>
          </>
        )
      ) : (
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => change("Active")}>
          {t("detail.restore")}
        </button>
      )}
    </div>
  );
}
