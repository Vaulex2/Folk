import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAllSheep, getHealthNotes, getMatings, getWeightRecords } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import HealthPill from "@/components/HealthPill";
import StatusActions from "./StatusActions";
import AddNoteForm from "./AddNoteForm";
import AddWeightForm from "./AddWeightForm";
import PhotoUploader from "./PhotoUploader";
import GrowthChart from "@/components/GrowthChart";
import { IconChevL } from "@/components/icons";
import { averageDailyGain, fmtDate, fmtMoney, findSheep, getOpenMatingForEwe, offspringOf, view } from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function SheepDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { id } = await params;
  const sheepId = parseInt(id, 10);
  const { locale, t } = await getServerT();
  const m = getMessages(locale);
  const today = new Date();

  const [all, notes, matings, weights] = await Promise.all([
    getAllSheep(),
    getHealthNotes(sheepId),
    getMatings(),
    getWeightRecords(sheepId),
  ]);
  const sheep = findSheep(all, sheepId);
  if (!sheep) notFound();
  const openMating = sheep.sex === "Ewe" ? getOpenMatingForEwe(matings, sheep.id) : undefined;

  const s = view(sheep, today, locale);
  const mother = sheep.mother_id ? findSheep(all, sheep.mother_id) : undefined;
  const father = sheep.father_id ? findSheep(all, sheep.father_id) : undefined;
  const mv = mother ? view(mother, today, locale) : null;
  const fv = father ? view(father, today, locale) : null;
  const offspring = offspringOf(all, sheep.id).map((o) => view(o, today, locale));

  return (
    <>
      <Link className="btn btn-ghost" href="/sheep" style={{ marginBottom: 12 }}>
        <IconChevL />{t("detail.backToList")}
      </Link>

      <div className="detail-top">
        <span className="avatar">
          {s.photoUrl ? <Image src={s.photoUrl} alt={s.tag} width={84} height={84} /> : s.tag}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 className="detail-tag">{s.tag}</h1>
            <HealthPill health={s.health} label={s.healthLabel} style={{ fontSize: 12, padding: "4px 12px" }} />
            {sheep.status !== "Active" && (
              <span className="tag tag-neutral" style={{ fontSize: 12 }}>{s.statusLabel}</span>
            )}
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            {s.sexWithLamb} · {s.breed} · {s.colorLabel}
          </p>

          <div className="facts">
            <div><div className="fact-l">{t("detail.factSex")}</div><div className="fact-v">{s.sexLabel}</div></div>
            <div><div className="fact-l">{t("detail.factAge")}</div><div className="fact-v">{s.ageLabel}</div></div>
            <div><div className="fact-l">{t("detail.factBorn")}</div><div className="fact-v">{s.birthLabel}</div></div>
            <div><div className="fact-l">{t("detail.factBreed")}</div><div className="fact-v">{s.breed}</div></div>
            <div><div className="fact-l">{t("detail.factColour")}</div><div className="fact-v">{s.colorLabel}</div></div>
            <div><div className="fact-l">{t("detail.factWeight")}</div><div className="fact-v">{s.weight}</div></div>
            {sheep.vaccination_date && (
              <div><div className="fact-l">{t("form.nextVaccination")}</div><div className="fact-v">{fmtDate(sheep.vaccination_date, locale)}</div></div>
            )}
            {sheep.due_date && (
              <div><div className="fact-l">{t("detail.dueDate")}</div><div className="fact-v">{fmtDate(sheep.due_date, locale)}</div></div>
            )}
            {sheep.purchase_price != null && (
              <div><div className="fact-l">{t("money.purchasePrice")}</div><div className="fact-v">{fmtMoney(Number(sheep.purchase_price))} {t("money.currency")}</div></div>
            )}
            {sheep.status === "Sold" && sheep.sale_price != null && (
              <div><div className="fact-l">{t("money.salePrice")}</div><div className="fact-v">{fmtMoney(Number(sheep.sale_price))} {t("money.currency")}</div></div>
            )}
            {sheep.status === "Sold" && sheep.sale_date && (
              <div><div className="fact-l">{t("money.saleDate")}</div><div className="fact-v">{fmtDate(sheep.sale_date, locale)}</div></div>
            )}
            {sheep.status === "Died" && sheep.death_date && (
              <div><div className="fact-l">{t("history.deathDate")}</div><div className="fact-v">{fmtDate(sheep.death_date, locale)}</div></div>
            )}
          </div>

          <StatusActions id={sheep.id} status={sheep.status} />
          <div className="form-actions" style={{ marginTop: 10 }}>
            {openMating && (
              <Link className="btn btn-primary" href={`/breeding/lambing/${openMating.id}`}>
                {t("detail.recordLambing")}
              </Link>
            )}
            <PhotoUploader sheepId={sheep.id} hasPhoto={!!s.photoUrl} />
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>{t("detail.parents")}</h2>
      <div className="relgrid">
        {fv ? (
          <Link className="relcard" href={`/sheep/${fv.id}`}>
            <span className="rc-role">{t("detail.sireFather")}</span>
            <span className="rc-tag">{fv.tag}</span>
            <span className="rc-meta">{m.sex.Ram} · {fv.breed} · {fv.ageLabel}</span>
          </Link>
        ) : (
          <div className="relcard void">
            <span className="rc-role">{t("detail.sireFather")}</span>
            <span className="rc-tag">—</span>
            <span className="rc-meta">{t("detail.notRecorded")}</span>
          </div>
        )}
        {mv ? (
          <Link className="relcard" href={`/sheep/${mv.id}`}>
            <span className="rc-role">{t("detail.damMother")}</span>
            <span className="rc-tag">{mv.tag}</span>
            <span className="rc-meta">{m.sex.Ewe} · {mv.breed} · {mv.ageLabel}</span>
          </Link>
        ) : (
          <div className="relcard void">
            <span className="rc-role">{t("detail.damMother")}</span>
            <span className="rc-tag">—</span>
            <span className="rc-meta">{t("detail.notRecorded")}</span>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>
        {t("detail.offspring")}{" "}
        <span style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
          ({offspring.length})
        </span>
      </h2>
      <div className="chips">
        {offspring.map((o) => (
          <Link key={o.id} className="node" href={`/sheep/${o.id}`}>
            <span className="node-tag">{o.tag}</span>
            <span className="node-meta">{o.sexLabel} · {o.ageLabel}</span>
          </Link>
        ))}
        {offspring.length === 0 && <div className="empty">{t("detail.noOffspring")}</div>}
      </div>

      <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>{t("weights.title")}</h2>
      <div className="panel">
        {(() => {
          const adg = averageDailyGain(weights);
          if (adg.overall == null && adg.recent == null) return null;
          return (
            <div className="facts" style={{ marginTop: 0, marginBottom: 12 }}>
              {adg.overall != null && (
                <div>
                  <div className="fact-l">{t("weights.adgOverall")}</div>
                  <div className="fact-v">{adg.overall > 0 ? "+" : ""}{adg.overall} {t("weights.gPerDay")}</div>
                </div>
              )}
              {adg.recent != null && (
                <div>
                  <div className="fact-l">{t("weights.adgRecent")}</div>
                  <div className="fact-v">{adg.recent > 0 ? "+" : ""}{adg.recent} {t("weights.gPerDay")}</div>
                </div>
              )}
            </div>
          );
        })()}
        <GrowthChart
          points={weights.map((w) => ({ date: w.date, kg: Number(w.weight_kg), label: fmtDate(w.date, locale) }))}
          firstLabel={weights.length ? fmtDate(weights[0].date, locale) : ""}
          lastLabel={weights.length ? fmtDate(weights[weights.length - 1].date, locale) : ""}
          kgUnit={m.units.kg}
        />
        <div className="notes" style={{ marginTop: weights.length >= 2 ? 12 : 0 }}>
          {weights
            .slice()
            .reverse()
            .map((w) => (
              <div key={w.id} className="noterow">
                <span className="nd">{fmtDate(w.date, locale)}</span>
                <span className="nt">{Number(w.weight_kg)} {m.units.kg}</span>
                <span />
              </div>
            ))}
          {weights.length === 0 && <div className="empty">{t("weights.noRecords")}</div>}
        </div>
        <AddWeightForm sheepId={sheep.id} />
      </div>

      <h2 style={{ fontSize: 20, margin: "30px 0 12px" }}>{t("detail.healthHistory")}</h2>
      <div className="panel">
        <div className="notes">
          {notes.map((n) => (
            <div key={n.id} className="noterow">
              <span className="nd">{fmtDate(n.date, locale)}</span>
              <span className="nt">{n.note}</span>
              {n.status ? <HealthPill health={n.status} label={m.health[n.status]} /> : <span />}
            </div>
          ))}
          {notes.length === 0 && <div className="empty">{t("detail.noNotes")}</div>}
        </div>
        <AddNoteForm sheepId={sheep.id} />
      </div>
    </>
  );
}
