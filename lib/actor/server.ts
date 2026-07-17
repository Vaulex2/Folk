import "server-only";
import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "./config";

/** Who's using the app right now, for labeling notifications. No real auth —
 * just a name the user picked, read back from a cookie. */
export async function getActor(): Promise<string> {
  const store = await cookies();
  const v = store.get(ACTOR_COOKIE)?.value;
  return v && v.trim() ? decodeURIComponent(v.trim()) : "Unknown";
}
