"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import type { FormState } from "@/app/actions";

/** Sign in with the shared farm account. */
export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  if (!email || !password) return { error: "auth.errRequired" };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One generic message for every failure — a login form must not reveal
  // whether the email exists or which part was wrong.
  if (error) return { error: "auth.errInvalid" };

  redirect("/");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
