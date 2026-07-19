// Called synchronously from the Next.js app (app/actions.ts via lib/notify.ts)
// right after a sheep/mating write succeeds. Formats one Telegram message
// (always in Uzbek, independent of the app's language switcher), sends it,
// and logs it to notification_log. Deployed with JWT verification off — auth
// instead comes from the shared NOTIFY_SECRET header, since this is a
// server-to-server call, not a browser-facing one.
import { createClient } from "npm:@supabase/supabase-js@2";

/** Sends a plain-text message to the configured Telegram chat. Never throws —
 * a Telegram outage must not break the caller. */
async function sendTelegramMessage(text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    console.error("sendTelegramMessage: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error(`sendTelegramMessage: Telegram API error ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("sendTelegramMessage: request failed", err);
  }
}

type NotifyPayload =
  | { type: "new_sheep"; sheepId: number; tag: string; sex: string; breed: string | null; actor: string }
  | {
      type: "health_changed";
      sheepId: number;
      tag: string;
      previousHealth: string;
      newHealth: string;
      actor: string;
    }
  | {
      type: "removed";
      sheepId: number;
      tag: string;
      status: "Sold" | "Died";
      salePrice?: number | null;
      actor: string;
    }
  | { type: "restored"; sheepId: number; tag: string; actor: string }
  | { type: "sheep_edited"; sheepId: number; tag: string; changedFields: string[]; actor: string }
  | { type: "note_added"; sheepId: number; tag: string; note: string; actor: string }
  | { type: "mating_recorded"; eweId: number; eweTag: string; ramTag: string; matingDate: string; actor: string }
  | { type: "mating_failed"; eweId: number; eweTag: string; ramTag: string; actor: string }
  | {
      type: "bulk_added";
      count: number;
      sex: string;
      breed: string | null;
      firstTag: string;
      lastTag: string;
      actor: string;
    };

// Uzbek labels matching lib/i18n/messages.ts's `uz` locale, so wording stays
// consistent with the app itself.
const SEX_UZ: Record<string, string> = { Ewe: "Sovliq", Ram: "Qo‘chqor" };
const HEALTH_UZ: Record<string, string> = {
  Healthy: "Sog‘lom",
  "Needs attention": "E’tibor talab",
  "Under treatment": "Davolanmoqda",
  Pregnant: "Bo‘g‘oz",
  "Vaccination due": "Emlash kerak",
};
const STATUS_UZ: Record<string, string> = { Active: "Faol", Sold: "Sotilgan", Died: "O‘lgan" };
const FIELD_UZ: Record<string, string> = {
  tag: "teg",
  sex: "jinsi",
  birth: "tug‘ilgan sana",
  breed: "zot",
  color: "rang",
  weight: "vazn",
  mother_id: "onasi",
  father_id: "otasi",
  vaccination_date: "emlash sanasi",
  due_date: "tug‘ish muddati",
};

function healthUz(v: string): string {
  return HEALTH_UZ[v] ?? v;
}

function formatMessage(p: NotifyPayload): string {
  switch (p.type) {
    case "new_sheep":
      return `🐑 Yangi qo‘y qo‘shildi: ${p.tag} (${SEX_UZ[p.sex] ?? p.sex}, ${p.breed ?? "—"}) — ${p.actor} tomonidan`;
    case "health_changed":
      return `⚕️ Sog‘liq holati o‘zgardi: ${p.tag} — ${healthUz(p.previousHealth)} → ${healthUz(p.newHealth)} — ${p.actor} tomonidan`;
    case "removed": {
      const price =
        p.status === "Sold" && p.salePrice != null
          ? ` (${Math.round(p.salePrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so‘m)`
          : "";
      return `${p.status === "Sold" ? "💰" : "🕊️"} Qo‘y ${STATUS_UZ[p.status]} deb belgilandi: ${p.tag}${price} — ${p.actor} tomonidan`;
    }
    case "restored":
      return `♻️ Qo‘y faol holatga qaytarildi: ${p.tag} — ${p.actor} tomonidan`;
    case "sheep_edited": {
      const fields = p.changedFields.map((f) => FIELD_UZ[f] ?? f).join(", ");
      return `✏️ Qo‘y ma’lumotlari yangilandi: ${p.tag} (${fields}) — ${p.actor} tomonidan`;
    }
    case "note_added":
      return `📝 Sog‘liq eslatmasi qo‘shildi: ${p.tag} — “${p.note}” — ${p.actor} tomonidan`;
    case "mating_recorded":
      return `❤️ Yangi juftlash qayd etildi: ${p.eweTag} x ${p.ramTag} (${p.matingDate}) — ${p.actor} tomonidan`;
    case "mating_failed":
      return `💔 Juftlash muvaffaqiyatsiz tugadi: ${p.eweTag} x ${p.ramTag} — ${p.actor} tomonidan`;
    case "bulk_added":
      return `🐑 ${p.count} ta qo‘y birdan qo‘shildi: ${p.firstTag}–${p.lastTag} (${SEX_UZ[p.sex] ?? p.sex}, ${p.breed ?? "—"}) — ${p.actor} tomonidan`;
  }
}

/** Which sheep to attribute the notification_log row to, if any. */
function logSheepId(p: NotifyPayload): number | null {
  return "sheepId" in p ? p.sheepId : "eweId" in p ? p.eweId : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Fail closed: if the secret isn't configured, refuse rather than accept every
  // caller. Matches vaccination-reminder's CRON_SECRET check.
  const expected = Deno.env.get("NOTIFY_SECRET");
  if (!expected) {
    console.error("notify-event: NOTIFY_SECRET not configured; refusing request");
    return new Response("Server misconfigured", { status: 503 });
  }
  if (req.headers.get("x-notify-secret") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  await sendTelegramMessage(formatMessage(payload));

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabase
      .from("notification_log")
      .insert({ sheep_id: logSheepId(payload), type: payload.type, ref_date: null });
    if (error) console.error("notify-event: failed to log", error);
  } catch (err) {
    console.error("notify-event: failed to log", err);
  }

  return Response.json({ ok: true });
});
