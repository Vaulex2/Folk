// Invoked daily by pg_cron (see the cron.schedule() call in
// supabase/schema.sql) via pg_net's net.http_post. Scans for active sheep
// whose vaccination_date falls within the next 3 days and sends one digest
// message, deduped against notification_log so a missed cron run doesn't
// cause a duplicate or a silently skipped reminder on the next run.
//
// Deployed with --no-verify-jwt (cron has no user JWT to send); auth instead
// comes from the shared CRON_SECRET header, matching the value stashed in
// Supabase Vault that the cron job attaches to its request.
import { createClient } from "npm:@supabase/supabase-js@2";

/** Sends a plain-text message to the configured Telegram chat. Never throws —
 * a Telegram outage must not break the cron run that still needs to log what
 * it found. */
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const today = new Date();
  const in3 = new Date(today);
  in3.setDate(in3.getDate() + 3);

  let notified = 0;

  // -- Vaccinations falling due within 3 days --------------------------------
  const { data: candidates, error } = await supabase
    .from("sheep")
    .select("id, tag, breed, vaccination_date")
    .eq("status", "Active")
    .not("vaccination_date", "is", null)
    .gte("vaccination_date", isoDate(today))
    .lte("vaccination_date", isoDate(in3));

  if (error) {
    console.error("vaccination-reminder: query failed", error);
    return Response.json({ ok: false, error: error.message });
  }

  if (candidates && candidates.length > 0) {
    const { data: alreadySent } = await supabase
      .from("notification_log")
      .select("sheep_id, ref_date")
      .eq("type", "vaccination_due")
      .in(
        "sheep_id",
        candidates.map((c) => c.id)
      );

    const sentKeys = new Set((alreadySent ?? []).map((r) => `${r.sheep_id}:${r.ref_date}`));
    const due = candidates.filter((c) => !sentKeys.has(`${c.id}:${c.vaccination_date}`));

    if (due.length > 0) {
      const lines = due.map((c) => `• ${c.tag} (${c.breed ?? "—"}) — muddat: ${c.vaccination_date}`);
      await sendTelegramMessage(
        `💉 Emlash eslatmalari — ${due.length} ta qo‘y 3 kun ichida emlanishi kerak:\n${lines.join("\n")}`
      );

      const { error: logErr } = await supabase
        .from("notification_log")
        .insert(due.map((c) => ({ sheep_id: c.id, type: "vaccination_due", ref_date: c.vaccination_date })));
      if (logErr) console.error("vaccination-reminder: failed to log", logErr);
      notified += due.length;
    }
  }

  // -- Open tasks falling due within 3 days (incl. overdue ones never sent) --
  const { data: taskRows, error: taskErr } = await supabase
    .from("tasks")
    .select("id, title, due_date, sheep_id")
    .eq("done", false)
    .not("due_date", "is", null)
    .lte("due_date", isoDate(in3));

  if (taskErr) {
    console.error("vaccination-reminder: task query failed", taskErr);
  } else if (taskRows && taskRows.length > 0) {
    const { data: taskSent } = await supabase
      .from("notification_log")
      .select("task_id, ref_date")
      .eq("type", "task_due")
      .in(
        "task_id",
        taskRows.map((t) => t.id)
      );

    const taskSentKeys = new Set((taskSent ?? []).map((r) => `${r.task_id}:${r.ref_date}`));
    const dueTasks = taskRows.filter((t) => !taskSentKeys.has(`${t.id}:${t.due_date}`));

    if (dueTasks.length > 0) {
      const lines = dueTasks.map((t) => `• ${t.title} — muddat: ${t.due_date}`);
      await sendTelegramMessage(
        `📋 Vazifa eslatmalari — ${dueTasks.length} ta vazifaning muddati yaqin:\n${lines.join("\n")}`
      );

      const { error: taskLogErr } = await supabase
        .from("notification_log")
        .insert(dueTasks.map((t) => ({ task_id: t.id, type: "task_due", ref_date: t.due_date })));
      if (taskLogErr) console.error("vaccination-reminder: failed to log tasks", taskLogErr);
      notified += dueTasks.length;
    }
  }

  return Response.json({ ok: true, notified });
});
