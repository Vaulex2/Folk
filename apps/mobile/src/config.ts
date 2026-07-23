// App configuration read from Expo public env vars (EXPO_PUBLIC_*), which are
// inlined into the JS bundle at build time — the mobile equivalent of the web
// app's NEXT_PUBLIC_* vars. Only the publishable (anon) key ever ships in the
// client; the secret key stays server-side and is never referenced here.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const config = {
  supabaseUrl: url ?? "",
  supabaseAnonKey: anonKey ?? "",
  flockName: process.env.EXPO_PUBLIC_FLOCK_NAME || "Flock",
  photoBucket: "sheep-photos",
};

export function hasSupabaseConfig(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
