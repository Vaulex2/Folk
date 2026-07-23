import "server-only";
import { getSupabase } from "@/lib/supabase";
import { getActor } from "@/lib/actor/server";
import { logError } from "@/lib/log";

export type NotifyPayload =
  | {
      type: "new_sheep";
      sheepId: number;
      tag: string;
      sex: string;
      breed: string | null;
      birth?: string;
      color?: string | null;
      weight?: number;
      motherTag?: string | null;
      fatherTag?: string | null;
    }
  | { type: "health_changed"; sheepId: number; tag: string; previousHealth: string; newHealth: string }
  | { type: "removed"; sheepId: number; tag: string; status: "Sold" | "Died"; salePrice?: number | null }
  | { type: "restored"; sheepId: number; tag: string }
  | { type: "sheep_edited"; sheepId: number; tag: string; changedFields: string[] }
  | { type: "note_added"; sheepId: number; tag: string; note: string }
  | { type: "mating_recorded"; eweId: number; eweTag: string; ramTag: string; matingDate: string }
  | { type: "mating_failed"; eweId: number; eweTag: string; ramTag: string }
  | {
      type: "bulk_added";
      count: number;
      sex: string;
      breed: string | null;
      firstTag: string;
      lastTag: string;
      birth?: string;
      color?: string | null;
      weight?: number;
    };

/** Fire-and-forget Telegram notification via the notify-event Edge Function.
 * Never throws — a notification failure must not break the underlying
 * user-facing action (adding a sheep, recording a health note, etc). */
export async function notifyEvent(payload: NotifyPayload): Promise<void> {
  try {
    const actor = await getActor();
    const supabase = getSupabase();
    const secret = process.env.NOTIFY_SECRET;
    const { error } = await supabase.functions.invoke("notify-event", {
      body: { ...payload, actor },
      headers: secret ? { "x-notify-secret": secret } : undefined,
    });
    if (error) logError("notify", error, { type: payload.type });
  } catch (err) {
    logError("notify", err, { type: payload.type });
  }
}
