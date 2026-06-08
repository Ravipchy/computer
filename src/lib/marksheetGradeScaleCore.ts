/**
 * Percentage → letter grade for marksheet. Configured in Admin → Settings (stored in Settings).
 * Safe to import from client components (no DB).
 */

export type GradeBand = { minPercent: number; grade: string };

/** Matches previous hard-coded scale in examDocumentSplit. */
export const DEFAULT_MARKSHEET_GRADE_BANDS: GradeBand[] = [
  { minPercent: 85, grade: "S" },
  { minPercent: 75, grade: "A" },
  { minPercent: 65, grade: "B" },
  { minPercent: 55, grade: "C" },
  { minPercent: 50, grade: "D" },
  { minPercent: 0, grade: "D" },
];

export const MARKSHEET_GRADE_BANDS_KEY = "marksheet_grade_bands";

export function normalizeGradeBands(bands: GradeBand[]): GradeBand[] {
  const seen = bands
    .map((b) => ({
      minPercent: Math.max(0, Math.min(100, Number(b.minPercent) || 0)),
      grade: String(b.grade ?? "").trim(),
    }))
    .filter((b) => b.grade.length > 0);
  if (seen.length === 0) return [...DEFAULT_MARKSHEET_GRADE_BANDS];
  seen.sort((a, b) => b.minPercent - a.minPercent);
  if (!seen.some((b) => b.minPercent === 0)) {
    const last = seen[seen.length - 1];
    seen.push({ minPercent: 0, grade: last.grade });
  }
  return seen;
}

export function parseGradeBandsJson(raw: string | null | undefined): GradeBand[] {
  if (!raw?.trim()) return [...DEFAULT_MARKSHEET_GRADE_BANDS];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length === 0) return [...DEFAULT_MARKSHEET_GRADE_BANDS];
    const out: GradeBand[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const minPercent = Number(o.minPercent ?? o.minPct);
      const grade = String(o.grade ?? o.label ?? "").trim();
      if (!Number.isFinite(minPercent) || !grade) continue;
      out.push({
        minPercent: Math.max(0, Math.min(100, minPercent)),
        grade,
      });
    }
    return normalizeGradeBands(out);
  } catch {
    return [...DEFAULT_MARKSHEET_GRADE_BANDS];
  }
}

export function serializeGradeBandsJson(bands: GradeBand[]): string {
  return JSON.stringify(normalizeGradeBands(bands));
}

/** First matching band when sorted by minPercent descending (highest threshold wins). */
export function gradeFromPercentageWithBands(pct: number, bands: GradeBand[]): string {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const sorted = [...normalizeGradeBands(bands)].sort((a, b) => b.minPercent - a.minPercent);
  for (const b of sorted) {
    if (p >= b.minPercent) return b.grade;
  }
  return sorted[sorted.length - 1]?.grade ?? "—";
}

/** Total marks / max → % and letter, using subject rows when present (same rules as server). */
export function gradeFromMarksOrSubjectRows(
  subjectRows: Array<{
    internalObtained: number;
    internalMax: number;
    externalObtained: number;
    externalMax: number;
  }>,
  marksStr: string,
  maxWhenNoSubjects: number | undefined,
  bands: GradeBand[],
): { pct: number; grade: string } {
  let totalObt = 0;
  let totalMax = 0;
  if (subjectRows.length > 0) {
    for (const r of subjectRows) {
      totalObt += (Number(r.internalObtained) || 0) + (Number(r.externalObtained) || 0);
      totalMax += (Number(r.internalMax) || 0) + (Number(r.externalMax) || 0);
    }
  } else {
    totalObt = Number(marksStr) || 0;
    const m = Number(maxWhenNoSubjects);
    totalMax = Number.isFinite(m) && m > 0 ? m : 100;
  }
  const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 10000) / 100 : 0;
  return { pct, grade: gradeFromPercentageWithBands(pct, bands) };
}
