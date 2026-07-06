const consoleMethods = ["log", "warn", "error", "info", "debug", "trace"] as const;
type ConsoleMethod = (typeof consoleMethods)[number];

const STORAGE_KEY = "cherubscove.console.logging.enabled";
const DEV_MODE_STORAGE_KEY = "cherubscove.developer.mode";
const REMOTE_SETTING_KEY = "console_logging_enabled";
const REMOTE_DEV_MODE_KEY = "developer_mode";
const originalMethods = new Map<ConsoleMethod, (...args: unknown[]) => void>();

function getDefaultConsoleLoggingEnabled() {
  return import.meta.env.DEV;
}

export function getDeveloperModeEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = window.localStorage.getItem(DEV_MODE_STORAGE_KEY);
  return stored === "true";
}

export function setDeveloperModeEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY, String(enabled));
  }

  if (!enabled) {
    silenceConsole();
  }

  return enabled;
}

function silenceConsole() {
  if (typeof window === "undefined") {
    return;
  }

  consoleMethods.forEach((method) => {
    if (!originalMethods.has(method)) {
      originalMethods.set(method, console[method]);
    }
    console[method] = (() => undefined) as typeof console.log;
  });
}

function restoreConsole() {
  if (typeof window === "undefined") {
    return;
  }

  consoleMethods.forEach((method) => {
    const original = originalMethods.get(method);
    if (original) {
      console[method] = original;
    }
  });
}

export function getConsoleLoggingEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!getDeveloperModeEnabled()) {
    return false;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    return getDefaultConsoleLoggingEnabled();
  }

  return stored === "true";
}

export function setConsoleLoggingEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }

  if (enabled) {
    restoreConsole();
  } else {
    silenceConsole();
  }

  return enabled;
}

export async function initializeConsoleLoggingPreference() {
  if (typeof window === "undefined") {
    return getConsoleLoggingEnabled();
  }

  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const [{ data: devData, error: devError }, { data: logData, error: logError }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", REMOTE_DEV_MODE_KEY).maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", REMOTE_SETTING_KEY).maybeSingle(),
    ]);

    if (!devError && devData?.value !== undefined && devData?.value !== null) {
      setDeveloperModeEnabled(String(devData.value) === "true");
    }

    const defaultEnabled = getConsoleLoggingEnabled();
    if (defaultEnabled) {
      restoreConsole();
    } else {
      silenceConsole();
    }

    if (!logError && logData?.value !== undefined && logData?.value !== null) {
      const remoteEnabled = String(logData.value) === "true";
      setConsoleLoggingEnabled(remoteEnabled);
      return remoteEnabled;
    }

    return defaultEnabled;
  } catch {
    const defaultEnabled = getConsoleLoggingEnabled();
    if (defaultEnabled) {
      restoreConsole();
    } else {
      silenceConsole();
    }
    return defaultEnabled;
  }
}

export async function persistConsoleLoggingPreference(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (!getDeveloperModeEnabled()) {
    setConsoleLoggingEnabled(false);
    return;
  }

  setConsoleLoggingEnabled(enabled);

  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data: existingRows } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", REMOTE_SETTING_KEY)
      .limit(1);

    if (existingRows?.[0]?.id) {
      await supabase
        .from("site_settings")
        .update({ value: String(enabled), label: "Developer — Show Console Logs", type: "boolean" })
        .eq("id", existingRows[0].id);
    } else {
      await supabase.from("site_settings").insert({
        key: REMOTE_SETTING_KEY,
        label: "Developer — Show Console Logs",
        value: String(enabled),
        type: "boolean",
      });
    }
  } catch {
    // Ignore persistence failures and keep the local preference active.
  }
}

export async function persistDeveloperModePreference(enabled: boolean) {
  setDeveloperModeEnabled(enabled);

  if (typeof window === "undefined") {
    return;
  }

  if (!enabled) {
    setConsoleLoggingEnabled(false);
  }

  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data: existingRows } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", REMOTE_DEV_MODE_KEY)
      .limit(1);

    if (existingRows?.[0]?.id) {
      await supabase
        .from("site_settings")
        .update({ value: String(enabled), label: "Developer Mode", type: "boolean" })
        .eq("id", existingRows[0].id);
    } else {
      await supabase.from("site_settings").insert({
        key: REMOTE_DEV_MODE_KEY,
        label: "Developer Mode",
        value: String(enabled),
        type: "boolean",
      });
    }
  } catch {
    // Ignore persistence failures and keep the local preference active.
  }
}
