import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// Biometric / device-PIN app-lock. The phone stays logged in to the shared farm
// account, so this is the at-rest gate: on cold start (and return from
// background) the user must pass device auth before the flock is shown.

const ENABLED_KEY = "flock.appLock.enabled";

export async function isLockAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function isLockEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(ENABLED_KEY);
  return v === "1";
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(ENABLED_KEY, enabled ? "1" : "0");
}

export async function authenticate(): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Flock",
    fallbackLabel: "Use device PIN",
  });
  return res.success;
}
