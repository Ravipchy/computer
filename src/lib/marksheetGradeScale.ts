import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import {
  MARKSHEET_GRADE_BANDS_KEY,
  parseGradeBandsJson,
  type GradeBand,
} from "./marksheetGradeScaleCore";

export {
  DEFAULT_MARKSHEET_GRADE_BANDS,
  MARKSHEET_GRADE_BANDS_KEY,
  gradeFromPercentageWithBands,
  gradeFromMarksOrSubjectRows,
  normalizeGradeBands,
  parseGradeBandsJson,
  serializeGradeBandsJson,
  type GradeBand,
} from "./marksheetGradeScaleCore";

export async function getMarksheetGradeBands(): Promise<GradeBand[]> {
  await connectDB();
  const row = await Settings.findOne({ key: MARKSHEET_GRADE_BANDS_KEY }).lean();
  return parseGradeBandsJson(row?.value);
}
