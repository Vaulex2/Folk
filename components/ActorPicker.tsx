"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActor } from "./ActorProvider";
import { useT } from "./I18nProvider";
import { ACTOR_COOKIE } from "@/lib/actor/config";

export default function ActorPicker({ className = "input" }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  const { actor, setActor } = useActor();
  const [value, setValue] = useState(actor === "Unknown" ? "" : actor);

  function commit() {
    const next = value.trim();
    if (!next || next === actor) return;
    // 1-year cookie; server components/actions read it on the next request.
    document.cookie = `${ACTOR_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    setActor(next);
    router.refresh();
  }

  return (
    <input
      className={className}
      aria-label={t("nav.actingAs")}
      placeholder={t("nav.actingAsPlaceholder")}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
