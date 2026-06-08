"use client";

import { useState, type FormEvent } from "react";
import { FileText, Search, Printer } from "lucide-react";
import AdmitCard from "@/components/student/AdmitCard";

interface StudentData {
  _id: string;
  name: string;
  enrollmentNo: string;
  registrationNo?: string;
  course: string;
  tpCode: string;
}

interface QuestionSet {
  _id: string;
  title: string;
  durationMinutes: number;
}

interface AdmitExamData {
  _id: string;
  examDate?: string;
  examTime?: string;
  durationMinutes?: number;
  examMode?: string;
  offlineDetails?: { preferredCenter?: string };
}

export default function AdmitCardViewer() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [assignment, setAssignment] = useState<{ examDate?: string; notes?: string } | null>(null);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [exam, setExam] = useState<AdmitExamData | null>(null);
  const [showAdmitModal, setShowAdmitModal] = useState(false);

  const fetchAdmitCard = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const value = identifier.trim();
    if (!value) {
      setError("Enter a student registration number or ID.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const admitRes = await fetch(`/api/public/admit-card?identifier=${encodeURIComponent(value)}`);
      const admitData = await admitRes.json();
      if (admitRes.ok) {
        setExam(admitData.exam ?? null);
        setStudent(admitData.student ?? null);
      } else {
        setError(admitData.message || "Unable to find admit card.");
        setExam(null);
        setStudent(null);
        setAssignment(null);
        setSets([]);
        return;
      }

      // Optional details panel: if this fails, admit card should still work.
      try {
        const res = await fetch(`/api/student/exams?identifier=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (res.ok) {
          setAssignment(data.assignment ?? null);
          setSets(data.sets ?? []);
        } else {
          setAssignment(null);
          setSets([]);
        }
      } catch {
        setAssignment(null);
        setSets([]);
      }
    } catch {
      setError("Unable to fetch admit card details.");
      setStudent(null);
      setAssignment(null);
      setSets([]);
      setExam(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Download Admit Card</h2>
            <p className="text-sm text-slate-500">Search by student registration number or ID to view exam allotment and admit card details.</p>
          </div>
        </div>

        <form onSubmit={fetchAdmitCard} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            placeholder="Enter registration number or student ID"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-70"
          >
            <Search className="w-4 h-4" />
            {loading ? "Searching…" : "Find Admit Card"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {student && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Admit Card</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">{student.name}</h3>
              <p className="text-sm text-slate-500">
                Enrollment no. {student.enrollmentNo}
                {student.registrationNo ? (
                  <span className="block text-slate-600">Registration no. {student.registrationNo}</span>
                ) : null}
              </p>
            </div>
            <button onClick={() => setShowAdmitModal(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition">
              <Printer className="w-4 h-4" /> Print Admit Card
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Course</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{student.course || "N/A"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Center Code</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{student.tpCode || "N/A"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Exam Date</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{exam?.examDate ? new Date(exam.examDate).toLocaleDateString("en-IN") : (assignment?.examDate || "Not scheduled")}</p>
            </div>
          </div>

          {exam?._id ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowAdmitModal(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                View Admit Card
              </button>
              <a
                href={`/admit-card/${exam._id}?print=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Download / Print Admit Card
              </a>
            </div>
          ) : (
            <p className="mt-6 text-xs font-semibold text-amber-700">Admit card is not released yet.</p>
          )}

          <div className="mt-6 rounded-3xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-800">Assigned Sets</p>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">{sets.length} sets</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sets.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 text-center text-slate-400">No sets assigned yet.</div>
              ) : (
                sets.map((set) => (
                  <div key={set._id} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-semibold text-slate-800">{set.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{set.durationMinutes} mins</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {assignment?.notes && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Notes</p>
              <p className="mt-2 text-sm text-slate-700">{assignment.notes}</p>
            </div>
          )}
        </div>
      )}

      {showAdmitModal && student && exam && (
        <AdmitCard
          student={student}
          exam={exam}
          onClose={() => setShowAdmitModal(false)}
        />
      )}
    </div>
  );
}
