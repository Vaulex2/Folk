import { getServerT } from "@/lib/i18n/server";

export default async function SetupNotice() {
  const { t } = await getServerT();
  return (
    <div className="pagehead">
      <h1>{t("setup.title")}</h1>
      <p>{t("setup.intro")}</p>
      <div className="panel" style={{ marginTop: 18, maxWidth: 620 }}>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>{t("setup.step1")}</li>
          <li>{t("setup.step2")}</li>
          <li>{t("setup.step3")}</li>
        </ol>
      </div>
    </div>
  );
}
