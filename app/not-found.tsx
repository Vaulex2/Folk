import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getServerT();
  return (
    <div className="pagehead" style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
      <h1>{t("errors.notFoundTitle")}</h1>
      <p>{t("errors.notFoundBody")}</p>
      <Link className="btn btn-primary" href="/" style={{ marginTop: 12, display: "inline-flex" }}>
        {t("errors.goHome")}
      </Link>
    </div>
  );
}
