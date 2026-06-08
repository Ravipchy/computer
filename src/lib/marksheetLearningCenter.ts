import { connectDB } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";
import { AtcApplication } from "@/models/AtcApplication";

/** One line for marksheet "Learning Center": name · address · ATC code. */
export async function learningCenterLineForMarksheet(atcId: unknown): Promise<string> {
  if (!atcId) return "";
  await connectDB();
  const atc = await AtcUser.findById(atcId).select("trainingPartnerName tpCode applicationId").lean();
  if (!atc) return "";
  let address = "";
  if (atc.applicationId) {
    const app = await AtcApplication.findById(atc.applicationId).select("trainingPartnerAddress").lean();
    address = typeof app?.trainingPartnerAddress === "string" ? app.trainingPartnerAddress.trim() : "";
  }
  const parts = [
    typeof atc.trainingPartnerName === "string" ? atc.trainingPartnerName.trim() : "",
    address,
    typeof atc.tpCode === "string" && atc.tpCode.trim() ? `ATC Reg: ${atc.tpCode.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}
