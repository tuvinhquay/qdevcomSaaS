import { getSettings } from "@/services/settings_service";
import type { AppSettings } from "@/lib/default_settings";

let appConfigCache: AppSettings | null = null;
let appConfigTenantId: string | null = null;

// Tai cau hinh theo tenant va luu cache trong memory cho toan app.
export async function loadAppConfig(tenantId: string): Promise<AppSettings> {
  if (appConfigCache && appConfigTenantId === tenantId) {
    return appConfigCache;
  }

  const settings = await getSettings(tenantId);
  appConfigCache = settings;
  appConfigTenantId = tenantId;

  return settings;
}

// Lay cau hinh da duoc load truoc do.
export function getAppConfig(): AppSettings {
  if (!appConfigCache) {
    throw new Error("App config chua duoc load. Hay goi loadAppConfig(tenantId) truoc.");
  }

  return appConfigCache;
}
