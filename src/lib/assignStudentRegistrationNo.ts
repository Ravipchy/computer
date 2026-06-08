import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { generateNextStudentRegistrationNumber } from "@/lib/idGenerator";

export function registrationNoNeedsAssignment(value: string | undefined | null): boolean {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t) return true;
  return t.startsWith("PENDING-") || t.startsWith("DIRECT-");
}

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

/**
 * Issues `registrationNo` from `reg_format_student_registration` when the admit card is released
 * (same moment as enrollment assignment). Idempotent if already set.
 */
export async function assignRegistrationNoIfPending(studentId: unknown): Promise<void> {
  if (!studentId) return;
  await connectDB();

  for (let attempt = 0; attempt < 15; attempt++) {
    const student = await AtcStudent.findById(studentId);
    if (!student) return;
    if (!registrationNoNeedsAssignment(student.registrationNo)) return;

    const next = await generateNextStudentRegistrationNumber();
    student.registrationNo = next;
    try {
      await student.save();
      return;
    } catch (e) {
      if (isDuplicateKeyError(e) && attempt < 14) continue;
      throw e;
    }
  }
}
