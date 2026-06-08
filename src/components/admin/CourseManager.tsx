"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import {
  PlusCircle,
  Trash2,
  Check,
  X,
  BookOpen,
  Layers,
  ListChecks,
  Pencil,
  Save,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import type { ZoneFeeRow } from "@/utils/affiliationFeeShared";

interface CourseSubject {
  name: string;
  fullMarks: number;
  theoryMarks: number;
  practicalMarks: number;
}

interface Course {
  _id: string;
  name: string;
  shortName: string;
  durationMonths: number;
  registrationFee: number;
  courseFee: number;
  zone: string;
  hasMarksheet: boolean;
  hasCertificate: boolean;
  subjects?: CourseSubject[];
  status: "active" | "inactive";
}

type SubjectDraft = {
  name: string;
  fullMarks: string;
  theoryMarks: string;
  practicalMarks: string;
};

const emptySubject = (): SubjectDraft => ({
  name: "",
  fullMarks: "",
  theoryMarks: "",
  practicalMarks: "",
});

function toDrafts(subjects?: CourseSubject[]): SubjectDraft[] {
  if (!subjects || subjects.length === 0) return [emptySubject()];
  return subjects.map((s) => ({
    name: s.name ?? "",
    fullMarks: String(s.fullMarks ?? ""),
    theoryMarks: String(s.theoryMarks ?? ""),
    practicalMarks: String(s.practicalMarks ?? ""),
  }));
}

/** Normalise + validate drafts. Drops empty rows. Returns null if any kept row is invalid. */
function draftsToPayload(drafts: SubjectDraft[]): CourseSubject[] | null {
  const out: CourseSubject[] = [];
  for (const d of drafts) {
    const name = d.name.trim();
    const hasAny = name || d.fullMarks || d.theoryMarks || d.practicalMarks;
    if (!hasAny) continue;
    if (!name) return null;
    const fullMarks = Number(d.fullMarks);
    const theoryMarks = Number(d.theoryMarks);
    const practicalMarks = Number(d.practicalMarks);
    if (![fullMarks, theoryMarks, practicalMarks].every((n) => Number.isFinite(n) && n >= 0)) {
      return null;
    }
    if (Math.abs(theoryMarks + practicalMarks - fullMarks) > 1) return null;
    out.push({ name, fullMarks, theoryMarks, practicalMarks });
  }
  return out;
}

export default function CourseManager() {
  const { loading: authLoading, user: authUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingSubjects, setSavingSubjects] = useState(false);

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [duration, setDuration] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [courseFee, setCourseFee] = useState("");
  const [zone, setZone] = useState("");
  const [zoneCatalog, setZoneCatalog] = useState<ZoneFeeRow[]>([]);
  const [zoneCatalogLoading, setZoneCatalogLoading] = useState(true);
  const [hasMarksheet, setHasMarksheet] = useState(true);
  const [hasCertificate, setHasCertificate] = useState(true);
  const [subjectDrafts, setSubjectDrafts] = useState<SubjectDraft[]>([emptySubject()]);

  const [editSubjects, setEditSubjects] = useState<SubjectDraft[]>([]);
  const [editRegistrationFee, setEditRegistrationFee] = useState("");
  const [editCourseFee, setEditCourseFee] = useState("");

  const fetchCourses = useCallback(async () => {
    if (authLoading || !authUser) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/courses");
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [authLoading, authUser]);

  useEffect(() => {
    if (!authLoading && authUser) {
      void fetchCourses();
    }
  }, [authLoading, authUser, fetchCourses]);

  useEffect(() => {
    let cancelled = false;
    setZoneCatalogLoading(true);
    apiFetch("/year-plans")
      .then((r) => r.json())
      .then((d: { zones?: ZoneFeeRow[] }) => {
        if (cancelled) return;
        const rows = Array.isArray(d.zones)
          ? d.zones
              .filter(
                (z): z is ZoneFeeRow =>
                  z != null && typeof z.name === "string" && typeof z.amount === "number",
              )
              .map((z) => ({ name: z.name.trim(), amount: Math.round(z.amount) }))
              .filter((z) => z.name.length > 0)
          : [];
        setZoneCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setZoneCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setZoneCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** While "Add course" is open, keep zone aligned with Affiliation zones & fees list. */
  useEffect(() => {
    if (!isAdding || zoneCatalogLoading || zoneCatalog.length === 0) return;
    setZone((prev) => {
      const names = zoneCatalog.map((z) => z.name);
      if (!prev || !names.includes(prev)) return zoneCatalog[0].name;
      return prev;
    });
  }, [isAdding, zoneCatalog, zoneCatalogLoading]);

  const resetAddForm = () => {
    setName("");
    setShortName("");
    setDuration("");
    setRegistrationFee("");
    setCourseFee("");
    setZone("");
    setHasMarksheet(true);
    setHasCertificate(true);
    setSubjectDrafts([emptySubject()]);
  };

  const handleAddCourse = async () => {
    const finalZone = zone.trim();
    if (!name || !shortName || !duration || !registrationFee || !finalZone) return;

    const subjectsPayload = draftsToPayload(subjectDrafts);
    if (subjectsPayload === null) {
      alert(
        "Please fix the subjects table. Each subject needs a name, valid numeric marks, and Theory + Practical must equal Full Marks.",
      );
      return;
    }

    try {
      const res = await apiFetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortName,
          durationMonths: Number(duration),
          registrationFee: Number(registrationFee),
          courseFee: Number(courseFee),
          zone: finalZone,
          hasMarksheet,
          hasCertificate,
          subjects: subjectsPayload,
        }),
      });
      if (res.ok) {
        setIsAdding(false);
        resetAddForm();
        void fetchCourses();
      }
    } catch {
      /* ignore */
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await apiFetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      if (res.ok) void fetchCourses();
    } catch {
      /* ignore */
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await apiFetch(`/api/admin/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      void fetchCourses();
    } catch {
      /* ignore */
    }
  };

  const handleToggleField = async (
    id: string,
    field: "hasMarksheet" | "hasCertificate",
    currentValue: boolean,
  ) => {
    try {
      await apiFetch(`/api/admin/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      void fetchCourses();
    } catch {
      /* ignore */
    }
  };

  const beginEditSubjects = (course: Course) => {
    setEditingId(course._id);
    setEditSubjects(toDrafts(course.subjects));
    setEditRegistrationFee(String(course.registrationFee || ""));
    setEditCourseFee(String(course.courseFee || ""));
  };

  const cancelEditSubjects = () => {
    setEditingId(null);
    setEditSubjects([]);
    setEditRegistrationFee("");
    setEditCourseFee("");
  };

  const saveSubjects = async () => {
    if (!editingId) return;
    const payload = draftsToPayload(editSubjects);
    if (payload === null) {
      alert(
        "Please fix the subjects table. Each subject needs a name and Theory + Practical must equal Full Marks.",
      );
      return;
    }
    setSavingSubjects(true);
    try {
      const res = await apiFetch(`/api/admin/courses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          subjects: payload,
          registrationFee: Number(editRegistrationFee),
          courseFee: Number(editCourseFee),
        }),
      });
      if (res.ok) {
        cancelEditSubjects();
        void fetchCourses();
      }
    } catch {
      /* ignore */
    } finally {
      setSavingSubjects(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Course Management
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-sm"
        >
          {isAdding ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add New Course"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Course Name</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                placeholder="e.g. Diploma in Computer Application"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Short Name</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                placeholder="e.g. DCA"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Months)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                placeholder="e.g. 12"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration Fee (INR)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                placeholder="e.g. 500"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Course Fee (Display) (INR)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                placeholder="e.g. 5000"
                value={courseFee}
                onChange={(e) => setCourseFee(e.target.value)}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Zone{" "}
                  <span className="font-normal normal-case text-slate-400">(from Affiliation zones and fees)</span>
                </label>
                {zoneCatalogLoading ? (
                  <p className="text-sm text-slate-500 py-2">Loading zone options…</p>
                ) : zoneCatalog.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      No zones in settings yet. Open{" "}
                      <span className="font-bold">Admin → Affiliation zones and fees</span>, add zones there, then refresh
                      this page. Or type a zone label below only if you must create a course before saving settings.
                    </p>
                    <input
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                      placeholder="Zone name"
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    />
                  </div>
                ) : (
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    {zoneCatalog.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-8 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setHasMarksheet(!hasMarksheet)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasMarksheet ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 bg-slate-50 text-transparent"}`}
                >
                  <Check size={14} className="stroke-3" />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition">
                  Generate Marksheet
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setHasCertificate(!hasCertificate)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${hasCertificate ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-200 bg-slate-50 text-transparent"}`}
                >
                  <Check size={14} className="stroke-3" />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition">
                  Generate Certificate
                </span>
              </label>
            </div>
          </div>

          <SubjectsEditor
            label="Subjects (used to build the marksheet)"
            drafts={subjectDrafts}
            onChange={setSubjectDrafts}
          />

          <button
            onClick={handleAddCourse}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
          >
            Create Course
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Course Name</th>
                <th className="px-6 py-4">Short Name</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Reg. Fee</th>
                <th className="px-6 py-4">Total Course Fee (Display) (INR)</th>
                <th className="px-6 py-4">Zone</th>
                <th className="px-6 py-4 text-center">Subjects</th>
                <th className="px-6 py-4 text-center">Marksheet</th>
                <th className="px-6 py-4 text-center">Certificate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-4">
                    <SkeletonLoader type="card" count={3} />
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                    No courses defined yet.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <CourseRow
                    key={c._id}
                    course={c}
                    isEditing={editingId === c._id}
                    saving={savingSubjects}
                    editDrafts={editSubjects}
                    editRegistrationFee={editRegistrationFee}
                    editCourseFee={editCourseFee}
                    onEditDraftsChange={setEditSubjects}
                    onEditRegistrationFeeChange={setEditRegistrationFee}
                    onEditCourseFeeChange={setEditCourseFee}
                    onBeginEdit={() => beginEditSubjects(c)}
                    onCancelEdit={cancelEditSubjects}
                    onSaveEdit={saveSubjects}
                    onToggleField={handleToggleField}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteCourse}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type CourseRowProps = {
  course: Course;
  isEditing: boolean;
  saving: boolean;
  editDrafts: SubjectDraft[];
  editRegistrationFee: string;
  editCourseFee: string;
  onEditDraftsChange: (drafts: SubjectDraft[]) => void;
  onEditRegistrationFeeChange: (val: string) => void;
  onEditCourseFeeChange: (val: string) => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggleField: (
    id: string,
    field: "hasMarksheet" | "hasCertificate",
    currentValue: boolean,
  ) => void;
  onUpdateStatus: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
};

function CourseRow({
  course: c,
  isEditing,
  saving,
  editDrafts,
  editRegistrationFee,
  editCourseFee,
  onEditDraftsChange,
  onEditRegistrationFeeChange,
  onEditCourseFeeChange,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleField,
  onUpdateStatus,
  onDelete,
}: CourseRowProps) {
  const subjectCount = c.subjects?.length ?? 0;

  return (
    <>
      <tr className="hover:bg-slate-50 transition">
        <td className="px-6 py-4 font-bold text-slate-700">{c.name}</td>
        <td className="px-6 py-4 text-slate-500">{c.shortName}</td>
        <td className="px-6 py-4 text-slate-500">{c.durationMonths} Months</td>
        <td className="px-6 py-4 text-slate-700 font-bold">₹{c.registrationFee || 0}</td>
        <td className="px-6 py-4 text-slate-700 font-bold">₹{c.courseFee || 0}</td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 uppercase">
            <Layers className="w-3 h-3" />
            {c.zone}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <button
            onClick={isEditing ? onCancelEdit : onBeginEdit}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase transition ${
              isEditing
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : subjectCount > 0
                  ? "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ListChecks className="w-3 h-3" />
            {subjectCount} {subjectCount === 1 ? "Subject" : "Subjects"}
          </button>
        </td>
        <td className="px-6 py-4 text-center">
          <button
            onClick={() => onToggleField(c._id, "hasMarksheet", c.hasMarksheet)}
            className={`p-1.5 rounded-lg transition-all ${c.hasMarksheet ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" : "bg-slate-50 text-slate-300"}`}
            title={c.hasMarksheet ? "Marksheet Enabled" : "Marksheet Disabled"}
          >
            <Check className={`w-4 h-4 ${!c.hasMarksheet && "opacity-30"}`} />
          </button>
        </td>
        <td className="px-6 py-4 text-center">
          <button
            onClick={() => onToggleField(c._id, "hasCertificate", c.hasCertificate)}
            className={`p-1.5 rounded-lg transition-all ${c.hasCertificate ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-slate-50 text-slate-300"}`}
            title={c.hasCertificate ? "Certificate Enabled" : "Certificate Disabled"}
          >
            <Check className={`w-4 h-4 ${!c.hasCertificate && "opacity-30"}`} />
          </button>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onUpdateStatus(c._id, c.status)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
              c.status === "active"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {c.status === "active" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {c.status.toUpperCase()}
          </button>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            {!isEditing ? (
              <button
                onClick={onBeginEdit}
                className="p-2 text-slate-400 hover:text-indigo-600 transition"
                title="Edit subjects"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : null}
            <button
              onClick={() => onDelete(c._id)}
              className="p-2 text-slate-400 hover:text-red-600 transition"
              title="Delete course"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {isEditing ? (
        <tr className="bg-slate-50/60">
          <td colSpan={10} className="px-6 py-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration Fee (INR)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                    value={editRegistrationFee}
                    onChange={(e) => onEditRegistrationFeeChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Course Fee (Display) (INR)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm"
                    value={editCourseFee}
                    onChange={(e) => onEditCourseFeeChange(e.target.value)}
                  />
                </div>
              </div>
              <SubjectsEditor
                label={`Subjects for ${c.name}`}
                drafts={editDrafts}
                onChange={onEditDraftsChange}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-tight text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold uppercase tracking-tight text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : "Save Subjects"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

type SubjectsEditorProps = {
  label: string;
  drafts: SubjectDraft[];
  onChange: (drafts: SubjectDraft[]) => void;
};

function SubjectsEditor({ label, drafts, onChange }: SubjectsEditorProps) {
  const totals = useMemo(() => {
    let full = 0;
    let theory = 0;
    let practical = 0;
    for (const d of drafts) {
      full += Number(d.fullMarks) || 0;
      theory += Number(d.theoryMarks) || 0;
      practical += Number(d.practicalMarks) || 0;
    }
    return { full, theory, practical };
  }, [drafts]);

  const updateRow = (index: number, patch: Partial<SubjectDraft>) => {
    const next = drafts.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onChange(next);
  };

  const addRow = () => onChange([...drafts, emptySubject()]);
  const removeRow = (index: number) => {
    const next = drafts.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptySubject()]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-indigo-500" />
          {label}
        </label>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-tight border border-indigo-100 hover:bg-indigo-100"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add Subject
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left w-1/2">Subject</th>
              <th className="px-3 py-2 text-center">Full Marks</th>
              <th className="px-3 py-2 text-center">Theory Marks</th>
              <th className="px-3 py-2 text-center">Practical Marks</th>
              <th className="px-3 py-2 w-10" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {drafts.map((d, idx) => {
              const sum = (Number(d.theoryMarks) || 0) + (Number(d.practicalMarks) || 0);
              const fm = Number(d.fullMarks) || 0;
              const mismatch = fm > 0 && Math.abs(sum - fm) > 1;
              return (
                <tr key={idx} className={mismatch ? "bg-rose-50/40" : ""}>
                  <td className="px-3 py-2">
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                      placeholder="e.g. MS Office"
                      value={d.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm text-center tabular-nums"
                      placeholder="100"
                      value={d.fullMarks}
                      onChange={(e) => updateRow(idx, { fullMarks: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm text-center tabular-nums"
                      placeholder="70"
                      value={d.theoryMarks}
                      onChange={(e) => updateRow(idx, { theoryMarks: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-sm text-center tabular-nums"
                      placeholder="30"
                      value={d.practicalMarks}
                      onChange={(e) => updateRow(idx, { practicalMarks: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 text-[11px] font-bold text-slate-600">
            <tr>
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-center tabular-nums">{totals.full}</td>
              <td className="px-3 py-2 text-center tabular-nums">{totals.theory}</td>
              <td className="px-3 py-2 text-center tabular-nums">{totals.practical}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">
        For each subject, <span className="font-bold">Theory + Practical</span> must equal{" "}
        <span className="font-bold">Full Marks</span>. Empty rows are ignored on save.
      </p>
    </div>
  );
}
