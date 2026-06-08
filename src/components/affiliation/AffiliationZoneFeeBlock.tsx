"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, IndianRupee, Percent } from "lucide-react";
import { apiFetch } from "@/utils/api";
import type { FeeCalculationSnapshot, YearPlan, ZoneFeeRow } from "@/utils/affiliationFeeShared";
import { sumZoneAmountFromRows } from "@/utils/affiliationFeeShared";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type Props = {
  zones: string[];
  affiliationYear: string;
  onAffiliationYearChange: (year: string) => void;
  onCalculationUpdate: (calc: FeeCalculationSnapshot | null) => void;
  variant?: "public" | "admin";
  invalidAffiliationYear?: boolean;
  /** Line-by-line breakdown (base × years, discount, payable). Off by default on Become ATC / Create Center. */
  showFeeBreakdown?: boolean;
};

export default function AffiliationZoneFeeBlock({
  zones,
  affiliationYear,
  onAffiliationYearChange,
  onCalculationUpdate,
  variant = "public",
  invalidAffiliationYear = false,
  showFeeBreakdown = false,
}: Props) {
  const [yearPlans, setYearPlans] = useState<YearPlan[]>([]);
  const [zoneRows, setZoneRows] = useState<ZoneFeeRow[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [calculation, setCalculation] = useState<FeeCalculationSnapshot | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const onCalcRef = useRef(onCalculationUpdate);
  const onYearChangeRef = useRef(onAffiliationYearChange);

  useEffect(() => {
    onCalcRef.current = onCalculationUpdate;
  }, [onCalculationUpdate]);

  useEffect(() => {
    onYearChangeRef.current = onAffiliationYearChange;
  }, [onAffiliationYearChange]);

  const isAdmin = variant === "admin";
  const borderInvalid = invalidAffiliationYear
    ? isAdmin
      ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10"
      : "border-red-700 ring-2 ring-red-700/10 bg-red-50/40"
    : "";

  const zonesKey = JSON.stringify(zones);

  useEffect(() => {
    if (!zones.length) {
      onYearChangeRef.current("");
      onCalcRef.current(null);
      queueMicrotask(() => {
        setCalculation(null);
        setCalcError(null);
        setYearPlans([]);
        setZoneRows([]);
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPlansLoading(true);
      setCalcError(null);
      try {
        const r = await apiFetch("/year-plans");
        const d = (await r.json()) as { plans?: YearPlan[]; zones?: ZoneFeeRow[] };
        if (cancelled) return;
        setYearPlans(Array.isArray(d.plans) ? d.plans : []);
        if (Array.isArray(d.zones) && d.zones.length > 0) {
          setZoneRows(
            d.zones
              .filter((z): z is ZoneFeeRow => z != null && typeof z.name === "string" && typeof z.amount === "number")
              .map((z) => ({ name: z.name.trim(), amount: Math.round(z.amount) })),
          );
        } else {
          setZoneRows([]);
        }
      } catch {
        if (!cancelled) {
          setYearPlans([]);
          setZoneRows([]);
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [zonesKey, zones.length]);

  useEffect(() => {
    if (!zones.length) {
      onCalcRef.current(null);
      queueMicrotask(() => setCalculation(null));
      return;
    }
    if (!affiliationYear.trim()) {
      onCalcRef.current(null);
      queueMicrotask(() => setCalculation(null));
      return;
    }
    const y = parseInt(affiliationYear, 10);
    if (!Number.isFinite(y) || y < 1) {
      onCalcRef.current(null);
      queueMicrotask(() => setCalculation(null));
      return;
    }

    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setCalcError(null);
      setCalcLoading(true);
      try {
        const r = await apiFetch("/calculate-fee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zones, year: y }),
        });
        const d = (await r.json()) as { message?: string; calculation?: FeeCalculationSnapshot };
        if (!r.ok) throw new Error(d.message || "Could not calculate fee.");
        if (!d.calculation) throw new Error("Invalid response.");
        if (!cancelled) {
          setCalculation(d.calculation);
          onCalcRef.current(d.calculation);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setCalculation(null);
          onCalcRef.current(null);
          setCalcError(e instanceof Error ? e.message : "Could not calculate fee.");
        }
      } finally {
        if (!cancelled) setCalcLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zones, affiliationYear]);

  const regionBase = sumZoneAmountFromRows(zones, zoneRows);

  if (!zones.length) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        isAdmin ? "border-slate-200 bg-white" : "border-slate-100 bg-white"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 sm:px-5 py-3 border-b ${
          isAdmin ? "border-slate-200 bg-white" : "border-amber-100 bg-amber-50/80"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isAdmin ? "bg-amber-600" : "bg-amber-500"
          } shadow-sm`}
        >
          <IndianRupee className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className={`font-bold text-sm ${isAdmin ? "text-black" : "text-slate-800"}`}>
            Affiliation fee &amp; duration
          </h3>
          <p className={`text-xs ${isAdmin ? "text-slate-600" : "text-slate-500"}`}>
            Base total from zones, then choose years. Final amount is calculated on the server.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-4 bg-white">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            isAdmin ? "border-slate-200 bg-white" : "border-slate-200 bg-white"
          }`}
        >
          <span className={`text-xs font-bold uppercase tracking-wide ${isAdmin ? "text-black" : "text-slate-600"}`}>
            Zone base total
          </span>
          <span className={`text-lg font-black ${isAdmin ? "text-amber-700" : "text-amber-700"}`}>{inr(regionBase)}</span>
        </div>

        <div>
          <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isAdmin ? "text-black" : "text-slate-600"}`}>
            Select affiliation period *
          </p>
          {plansLoading && (
            <p className={`text-sm ${isAdmin ? "text-slate-600" : "text-slate-500"}`}>Loading plan options…</p>
          )}
          {!plansLoading && yearPlans.length === 0 && (
            <p className={`text-sm ${isAdmin ? "text-amber-900" : "text-amber-800"}`}>
              No year plans configured. Please contact the administrator.
            </p>
          )}
          <div
            className={`flex flex-wrap gap-2 rounded-xl p-1 ${borderInvalid} bg-white border border-slate-200`}
          >
            {yearPlans.map((p) => {
              const selected = affiliationYear === String(p.year);
              return (
                <button
                  key={p.year}
                  type="button"
                  onClick={() => onAffiliationYearChange(String(p.year))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition select-none cursor-pointer
                    ${
                      selected
                        ? isAdmin
                          ? "bg-amber-500 text-black border-amber-400 shadow-md"
                          : "bg-amber-500 text-white border-amber-500 shadow-md"
                        : isAdmin
                          ? "bg-white text-black border-slate-300 hover:border-amber-400"
                          : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
                    }`}
                >
                  <CalendarRange className="w-4 h-4 opacity-80" />
                  {p.year} {p.year === 1 ? "year" : "years"}
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                      selected ? (isAdmin ? "text-black/90" : "text-white/90") : isAdmin ? "text-amber-700" : "text-amber-700"
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    {p.discountPercent}% off
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {calcError && (
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{calcError}</p>
        )}

        {/* Default: show final payable after discount only — no long calculation breakdown */}
        {!showFeeBreakdown && affiliationYear && (calcLoading || calculation) && (
          <div
            className={`rounded-xl border px-4 py-3 ${
              isAdmin ? "border-slate-200 bg-white" : "border-slate-200 bg-white"
            }`}
          >
            {calcLoading && (
              <p className={`text-sm ${isAdmin ? "text-slate-600" : "text-slate-500"}`}>
                Calculating payable amount…
              </p>
            )}
            {!calcLoading && calculation && (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between gap-y-2">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${isAdmin ? "text-black" : "text-slate-700"}`}>
                    Amount payable
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    After {calculation.discountPercent}% discount (−{inr(calculation.discountAmount)})
                  </p>
                </div>
                <span className={`text-xl sm:text-2xl font-black tabular-nums ${isAdmin ? "text-amber-700" : "text-amber-700"}`}>
                  {inr(calculation.payableAmount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Optional: poori line-by-line breakdown — kahi zarurat ho to showFeeBreakdown */}
        {showFeeBreakdown && affiliationYear && (calcLoading || calculation) && (
          <div
            className={`rounded-xl border text-sm space-y-2 p-4 ${
              isAdmin ? "border-slate-200 bg-white" : "border-slate-200 bg-white"
            }`}
          >
            <p className={`font-bold uppercase tracking-wide text-xs ${isAdmin ? "text-black" : "text-slate-600"}`}>
              Breakdown
            </p>
            {calcLoading && (
              <p className={isAdmin ? "text-slate-600" : "text-slate-500"}>Calculating payable amount…</p>
            )}
            {!calcLoading && calculation && (
              <ul className={`space-y-1.5 font-medium ${isAdmin ? "text-black" : "text-slate-800"}`}>
                <li className="flex justify-between gap-2">
                  <span>Base (zones) × years</span>
                  <span>
                    {inr(calculation.totalAmount)} × {calculation.affiliationYear} = {inr(calculation.finalAmount)}
                  </span>
                </li>
                <li className="flex justify-between gap-2 text-emerald-600">
                  <span>Discount ({calculation.discountPercent}%)</span>
                  <span>− {inr(calculation.discountAmount)}</span>
                </li>
                <li
                  className={`flex justify-between gap-2 pt-2 border-t ${
                    isAdmin ? "border-slate-200 text-black" : "border-slate-200 text-emerald-800"
                  } font-bold text-base`}
                >
                  <span>Payable</span>
                  <span>{inr(calculation.payableAmount)}</span>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
