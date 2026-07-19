"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteTransaction } from "@/app/actions";
import { useT } from "@/components/I18nProvider";

export default function TransactionRow({
  txId,
  income,
  amountLabel,
  categoryLabel,
  note,
  dateLabel,
  linkedSheep,
}: {
  txId: number;
  income: boolean;
  amountLabel: string;
  categoryLabel: string;
  note: string | null;
  dateLabel: string | null;
  linkedSheep: { id: number; tag: string } | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT();

  const remove = () =>
    start(async () => {
      await deleteTransaction(txId);
      router.refresh();
    });

  return (
    <div className={`lgrow ${income ? "is-income" : "is-expense"}`} style={{ cursor: "default" }}>
      <span className="lg-dot" aria-hidden="true" />
      <span className="lg-desc">
        <span className="lg-cat">{categoryLabel}</span>
        {(note || linkedSheep) && (
          <span className="lg-meta">
            {note}
            {note && linkedSheep ? " · " : ""}
            {linkedSheep && (
              <Link href={`/sheep/${linkedSheep.id}`}>{linkedSheep.tag}</Link>
            )}
          </span>
        )}
      </span>
      <span className="lg-date">{dateLabel}</span>
      <span className={`lg-amount ${income ? "is-income" : "is-expense"}`}>{amountLabel}</span>
      <span className="lg-trail">
        <button
          className="btn btn-ghost lg-del"
          type="button"
          disabled={pending}
          onClick={remove}
          aria-label={t("finance.delete")}
        >
          ×
        </button>
      </span>
    </div>
  );
}
