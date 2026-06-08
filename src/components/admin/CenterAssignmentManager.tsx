"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { MapPin, RefreshCw, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";

interface CenterAssignmentManagerProps {
  approvedCenters: Array<{
    _id: string;
    tpCode?: string;
    trainingPartnerName: string;
    district: string;
    state: string;
    zones?: string[];
  }>;
}

interface QuestionSet {
  _id: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  isActive: boolean;
}

interface Assignment {
  _id: string;
  tpCode: string;
  setIds: string[];
  examDate?: string;
  notes?: string;
}

export default function CenterAssignmentManager({ approvedCenters }: CenterAssignmentManagerProps) {
  const { user: authUser } = useAuth();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [examDate, setExamDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSets, setLoadingSets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedCenter = useMemo(
    () => approvedCenters.find((center) => center._id === selectedCenterId) ?? null,
    [approvedCenters, selectedCenterId],
  );

  const fetchSets = useCallback(async () => {
    if (!authUser) return;
    setLoadingSets(true);
    try {
      const res = await apiFetch("/api/admin/question-sets");
      const data = await res.json();
      setSets(data.sets ?? []);
    } catch {
      setSets([]);
      setFeedback({ type: "error", text: "Unable to load exam sets." });
    } finally {
      setLoadingSets(false);
    }
  }, [authUser]);

  const fetchAssignment = async (center: { tpCode?: string; _id: string }) => {
    if (!center.tpCode && !center._id) return;
    setAssignment(null);
    try {
      const query = center.tpCode ? `tpCode=${encodeURIComponent(center.tpCode)}` : `centerId=${encodeURIComponent(center._id)}`;
      const res = await apiFetch(`/api/admin/center-assignments?${query}`);
      if (res.ok) {
        const data = await res.json();
        setAssignment(data.assignment ?? null);
        if (data.assignment?.setIds) {
          setSelectedSetIds(data.assignment.setIds);
          setExamDate(data.assignment.examDate ?? "");
          setNotes(data.assignment.notes ?? "");
        } else {
          setSelectedSetIds([]);
          setExamDate("");
          setNotes("");
        }
      } else {
        setSelectedSetIds([]);
        setExamDate("");
        setNotes("");
      }
    } catch {
      setFeedback({ type: "error", text: "Unable to load assignment details." });
    } finally {
      // no-op
    }
  };

  useEffect(() => {
    if (authUser) void fetchSets();
  }, [authUser, fetchSets]);

  useEffect(() => {
    if (selectedCenter) {
      void fetchAssignment(selectedCenter);
    } else {
      setAssignment(null);
      setSelectedSetIds([]);
      setExamDate("");
      setNotes("");
    }
  }, [selectedCenter]);

  const toggledSet = (setId: string) => {
    setSelectedSetIds((prev) =>
      prev.includes(setId) ? prev.filter((item) => item !== setId) : [...prev, setId],
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedCenter) {
      setFeedback({ type: "error", text: "Pick a center before saving assignment." });
      return;
    }
    if (selectedSetIds.length === 0) {
      setFeedback({ type: "error", text: "Select at least one exam set." });
      return;
    }
    if (selectedSetIds.length > 5) {
      setFeedback({ type: "error", text: "You can assign a maximum of 5 sets per center." });
      return;
    }

    setSaving(true);
    try {
      const body = {
        centerId: selectedCenter._id,
        tpCode: selectedCenter.tpCode,
        setIds: selectedSetIds,
        examDate: examDate.trim(),
        notes: notes.trim(),
      };
      const res = await apiFetch("/api/admin/center-assignments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.message || "Unable to save assignment." });
        return;
      }
      setAssignment(data.assignment ?? null);
      setFeedback({ type: "success", text: "Center assignment saved." });
    } catch {
      setFeedback({ type: "error", text: "Unable to save assignment." });
    } finally {
      setSaving(false);
    }
  };

  const activeSets = sets.filter((set) => set.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Exam Assignments
          </h2>
          <p className="text-sm text-slate-500">Assign available exam sets to approved centers and publish exam schedules.</p>
        </div>
        <button
          onClick={fetchSets}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh exam sets
        </button>
      </div>

      {feedback && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Approved Centers</h3>
              <p className="text-sm text-slate-500">Select a center to view or update its exam assignment.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {approvedCenters.length}
            </span>
          </div>

          <div className="mt-5 space-y-3 max-h-130 overflow-y-auto pr-2">
            {approvedCenters.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">No approved centers available.</div>
            ) : (
              approvedCenters.map((center) => (
                <button
                  key={center._id}
                  type="button"
                  onClick={() => setSelectedCenterId(center._id)}
                  className={`w-full text-left rounded-3xl border px-4 py-4 transition ${selectedCenterId === center._id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <p className="font-bold text-slate-800">{center.trainingPartnerName}</p>
                  <p className="mt-1 text-xs text-slate-500">{center.district}, {center.state}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(center.zones ?? []).slice(0, 3).map((zone) => (
                      <span key={zone} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{zone}</span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Assignment Details</h3>
              <p className="text-sm text-slate-500">Publish exam set selections for the chosen center.</p>
            </div>
            {selectedCenter && (
              <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                {selectedCenter.trainingPartnerName}
              </div>
            )}
          </div>

          {selectedCenter ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selected Center</p>
                  <p className="mt-2 font-semibold text-slate-800">{selectedCenter.trainingPartnerName}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedCenter.district}, {selectedCenter.state}</p>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current Assignment</p>
                  <p className="mt-2 text-sm text-slate-700">{assignment ? `${assignment.setIds.length} set(s)` : "No assignment yet."}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Exam Date</p>
                  <p className="text-sm text-slate-700">Optional</p>
                </div>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  placeholder="Any instructions or exam room details"
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Select Exam Sets</p>
                    <p className="text-xs text-slate-500">Choose up to 5 active sets for this center.</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{selectedSetIds.length} selected</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {loadingSets ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">Loading sets…</div>
                  ) : activeSets.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">No active sets available.</div>
                  ) : (
                    activeSets.map((set) => (
                      <button
                        key={set._id}
                        type="button"
                        onClick={() => toggledSet(set._id)}
                        className={`rounded-3xl border px-4 py-4 text-left transition ${selectedSetIds.includes(set._id) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <p className="font-bold text-slate-900">{set.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{set.durationMinutes} mins · {set.totalMarks} marks</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span className="font-semibold">Tip:</span> Centers should be assigned no more than 5 active sets. If the center already has an exam schedule, it will be updated.
                </div>
                <button
                  onClick={handleSaveAssignment}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving assignment…" : "Save Assignment"}
                </button>
              </div>

              {assignment && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Current assignment loaded.
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Assigned Sets</p>
                      <p className="mt-2 text-sm text-slate-700">{assignment.setIds.length} selected</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Exam Date</p>
                      <p className="mt-2 text-sm text-slate-700">{assignment.examDate || "Not scheduled"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">Select a center to review and assign exam sets.</div>
          )}
        </div>
      </div>
    </div>
  );
}
