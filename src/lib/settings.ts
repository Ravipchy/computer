import { connectDB, db } from "./db";
import { unstable_noStore as noStore } from "next/cache";

export async function getSetting(key: string, defaultValue: string = ""): Promise<string> {
  try {
    noStore();
    await connectDB();
    const setting = await db.setting.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown settings error";
    console.warn(`Settings fallback for "${key}": ${message}`);
    return defaultValue;
  }
}

export async function getBrandName(): Promise<string> {
  return getSetting("brand_name", "Institution");
}

export async function getFullBrandData() {
  try {
    noStore();
    await connectDB();
    const keys = [
      "brand_name",
      "brand_mobile",
      "brand_email",
      "brand_address",
      "brand_url",
      "brand_logo",
      "qr_code",
      "auth_signature",
    ];
    const settings = await db.setting.findMany({
      where: { key: { in: keys } },
    });
    const data: Record<string, string> = {};
    settings.forEach((setting) => {
      data[setting.key] = setting.value;
    });
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown settings error";
    console.warn(`Settings fallback for full brand data: ${message}`);
    return {};
  }
}
