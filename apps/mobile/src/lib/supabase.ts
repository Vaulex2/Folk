import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { config } from "../config";

// Mobile Supabase client. Uses the publishable (anon) key + a real user session,
// exactly like the web app's browser client — RLS (TO authenticated) is what
// guards the data, so no secret key ever reaches the device.
//
// Session persistence uses AsyncStorage. SecureStore would be the at-rest ideal
// but caps values at ~2KB on Android, which Supabase's JWT session can exceed;
// we get at-rest protection instead from the biometric app-lock (src/lib/appLock).
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommends pausing/resuming token auto-refresh with app foreground
// state so refresh timers don't fire uselessly in the background.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
