import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { generateNextStudentEnrollmentNumber } from "@/lib/idGenerator";

/** True if student still has a temporary placeholder, not the final issued enrollment number. */
export function enrollmentNoNeedsAssignment(value: string | undefined | null): boolean {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t) return true;
  return t.startsWith("PENDING-") || t.startsWith("DIRECT-");
}

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

/**
 * Issues the next enrollment number from Settings `reg_format_student` (Registration tab → student format)
 * when the student still has a placeholder. Runs when admin approves admission (student status → active)
 * and again when an exam is approved with admit card released (no-op if already issued).
 */
export async function assignEnrollmentNoIfPending(studentId: unknown): Promise<void> {
  if (!studentId) return;
  await connectDB();

  for (let attempt = 0; attempt < 15; attempt++) {
    const student = await AtcStudent.findById(studentId);
    if (!student) return;
    if (!enrollmentNoNeedsAssignment(student.enrollmentNo)) return;

    const next = await generateNextStudentEnrollmentNumber();
    student.enrollmentNo = next;
    try {
      await student.save();
      return;
    } catch (e) {
      if (isDuplicateKeyError(e) && attempt < 14) continue;
      throw e;
    }
  }
}
