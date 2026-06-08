/**
 * Exam slots are entered as wall-clock date + time (e.g. India).
 * On Vercel/Node in UTC, `new Date("YYYY-MM-DDTHH:mm:ss")` is interpreted as **UTC**,
 * which blocks result submission until ~5½h after the real local start.
 *
 * We combine calendar date + time with an explicit offset. Override for other regions via
 * `EXAM_SCHEDULE_UTC_OFFSET` (e.g. "+05:30", "-08:00").
 */

export function examScheduleUtcOffset(): string {
  const v = process.env.EXAM_SCHEDULE_UTC_OFFSET?.trim();
  return v || "+05:30";
}

/** "15:54", "9:05", "2:30 PM" → "HH:mm" or null */
export function normalizeExamTimeHM(raw: string): string | null {
  const s = String(raw).trim();
  const ampmMatch = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hh = Number(ampmMatch[1]);
    const mm = Number(ampmMatch[2]);
    const mer = ampmMatch[3].toUpperCase();
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || mm < 0 || mm > 59) return null;
    if (mer === "PM" && hh < 12) hh += 12;
    if (mer === "AM" && hh === 12) hh = 0;
    if (hh < 0 || hh > 23) return null;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  return null;
}

/** Calendar Y-M-D from stored exam date (UTC calendar day matches HTML date input). */
export function examCalendarYmd(examDate: string | Date): string | null {
  if (typeof examDate === "string") {
    const head = examDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    const parsed = new Date(examDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return examCalendarYmd(parsed);
  }
  const y = examDate.getUTCFullYear();
  const mo = String(examDate.getUTCMonth() + 1).padStart(2, "0");
  const da = String(examDate.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Single instant in UTC for a scheduled slot (for persistence and comparisons). */
export function buildExamDateTimeUtc(examDate: string | Date, examTime: string): Date | null {
  const ymd = examCalendarYmd(examDate);
  const hm = normalizeExamTimeHM(examTime);
  if (!ymd || !hm) return null;
  const off = examScheduleUtcOffset();
  const d = new Date(`${ymd}T${hm}:00${off}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Prefer recomputing from examDate + examTime when both exist (fixes legacy bad examDateTime).
 * Otherwise use stored examDateTime.
 */
export function getExamScheduledAtUtc(exam: {
  examDate?: unknown;
  examTime?: unknown;
  examDateTime?: unknown;
}): Date | null {
  const timeStr = exam.examTime != null ? String(exam.examTime) : "";
  if (exam.examDate && timeStr.trim()) {
    const dt = buildExamDateTimeUtc(exam.examDate as string | Date, timeStr);
    if (dt) return dt;
  }
  if (exam.examDateTime) {
    const d = new Date(exam.examDateTime as string | Date);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
