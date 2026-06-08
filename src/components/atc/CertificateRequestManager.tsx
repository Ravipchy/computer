"use client";

import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type FormEvent } from "react";
import { Users, Clock, Search, RefreshCw, Calendar, X, Building2, ClipboardCheck, Trash2, ScrollText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { deriveInternalExternalMax } from "@/lib/examDocumentSplit";
import {
  DEFAULT_MARKSHEET_GRADE_BANDS,
  MARKSHEET_GRADE_BANDS_KEY,
  gradeFromMarksOrSubjectRows,
  parseGradeBandsJson,
  type GradeBand,
} from "@/lib/marksheetGradeScaleCore";

interface ExamRequest {
  _id: string;
  atcId?: {
    _id?: string;
    trainingPartnerName?: string;
    tpCode?: string;
  };
  studentId: {
    _id: string;
    name: string;
    enrollmentNo: string;
    course: string;
    fatherName?: string;
    mobile?: string;
    photo?: string;
    profileImage?: string;
    session?: string;
  };
  examMode: "online" | "offline";
  offlineDetails?: {
    preferredDate?: string;
    preferredCenter?: string;
    preferredTimeSlot?: string;
  };
  examDate?: string;
  examTime?: string;
  setId?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  status: "pending" | "completed";
  admitCardReleased?: boolean;
  totalScore?: number;
  maxScore?: number;
  offlineExamStatus?: string;
  offlineExamResult?: string;
  offlineExamCopy?: string;
  marksheetReleased?: boolean;
  certificateReleased?: boolean;
  grade?: string;
  session?: string;
  courseSubjects?: Array<{
    name: string;
    fullMarks: number;
    theoryMarks: number;
    practicalMarks: number;
  }>;
  subjectMarks?: Array<{
    subjectName: string;
    internalObtained: number;
    internalMax: number;
    externalObtained: number;
    externalMax: number;
    marksObtained?: number;
    totalMarks?: number;
  }>;
  submittedAt?: string;
  updatedAt: string;
}

type SubjectResultRow = {
  subjectName: string;
  internalObtained: number;
  internalMax: number;
  externalObtained: number;
  externalMax: number;
};

interface QuestionSet {
  _id: string;
  title: string;
  questionCount: number;
}

interface AtcStudentLite {
  _id: string;
  name: string;
  enrollmentNo: string;
  status: string;
}

type ExamStatusForm = "not_appeared" | "appeared" | "published";

type OnlineAttemptItem = {
  order: number;
  questionText: string;
  options: string[];
  correctOption: string;
  selectedOption: string;
  correct: boolean;
  marksEarned: number;
  marks: number;
};

export default function CertificateRequestManager({ atcId, role = "atc" }: { atcId?: string, role?: "admin" | "atc" }) {
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "online" | "offline">("all");
  const [filterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    examDate: "",
    setId: "",
    examMode: "online"
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [atcTab, setAtcTab] = useState<"new" | "history">(role === "admin" ? "history" : "new");
  const [requestExamStudent, setRequestExamStudent] = useState<AtcStudentLite | null>(null);
  const [examReqForm, setExamReqForm] = useState({ 
    examMode: "online", 
    preferredDate: "", 
    preferredCenter: "",
    examDate: "",
    examTime: "",
    durationMinutes: "60",
    setId: ""
  });
  const [requesting, setRequesting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultForm, setResultForm] = useState({
    status: "published" as "not_appeared" | "appeared" | "published",
    marks: "",
    resultStatus: "Pass" as "Pass" | "Fail" | "Waiting",
  });
  const [resultSaving, setResultSaving] = useState(false);
  const [resultCopyFile, setResultCopyFile] = useState<File | null>(null);
  const [subjectResultRows, setSubjectResultRows] = useState<SubjectResultRow[]>([]);
  const [resultGradeBands, setResultGradeBands] = useState<GradeBand[]>(() => [
    ...DEFAULT_MARKSHEET_GRADE_BANDS,
  ]);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ 
    marksheet: true, 
    certificate: true 
  });

  const [onlineAttemptExam, setOnlineAttemptExam] = useState<ExamRequest | null>(null);
  const [onlineAttemptPayload, setOnlineAttemptPayload] = useState<{
    items: OnlineAttemptItem[];
    totalScore: number;
    maxScore: number;
    submittedAt: string | null;
  } | null>(null);
  const [onlineAttemptLoading, setOnlineAttemptLoading] = useState(false);

  const { loading: authLoading, user: authUser } = useAuth();

  const fetchRequests = useCallback(async () => {
    if (authLoading || !authUser) return;
    setLoading(true);
    try {
      const url = role === "admin" ? "/api/admin/exams/all" : "/api/atc/exams/all";
      const res = await apiFetch(url, { 
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
      
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, authUser, role]);

  const fetchQuestionSets = useCallback(async () => {
    if (authLoading || !authUser) return;
    try {
      const res = await apiFetch("/api/atc/question-sets");
      if (res.ok) {
        const data = await res.json();
        setQuestionSets(data.sets || []);
      }
    } catch (err) {
      console.error("Failed to fetch sets", err);
    }
  }, [authLoading, authUser]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    fetchRequests();
    fetchQuestionSets();
  }, [atcId, authLoading, authUser, fetchQuestionSets, fetchRequests, role]);

  const handleAction = async (requestId: string, status: string, details?: Record<string, unknown>) => {
    setActionLoading(requestId);
    try {
      const res = await apiFetch("/api/admin/exams/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId, status, ...details }),
      });
      if (res.ok) {
        await fetchRequests();
        setShowApproveModal(false);
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestExam = async (e: FormEvent) => {
    e.preventDefault();
    if (!requestExamStudent) return;
    setRequesting(true);
    try {
      const res = await apiFetch("/api/atc/exams/request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          studentId: requestExamStudent._id, 
          examMode: examReqForm.examMode,
          offlineDetails: examReqForm.examMode === 'offline' ? {
            preferredDate: examReqForm.examDate,
            preferredCenter: examReqForm.preferredCenter
          } : undefined,
          examDate: examReqForm.examDate,
          examTime: examReqForm.examTime,
          durationMinutes: Number(examReqForm.durationMinutes || 60),
          setId: examReqForm.examMode === "online" ? examReqForm.setId : undefined
        }),
      });
      if (res.ok) {
        await fetchRequests();
        setRequestExamStudent(null);
      }
    } catch (err) {
      console.error("Request failed", err);
    } finally {
      setRequesting(false);
    }
  };

  const handleResultSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setResultSaving(true);
    try {
      const submitStatus = role === "atc" ? "published" : resultForm.status;
      const rowSum = subjectResultRows.reduce(
        (s, r) => s + (Number(r.internalObtained) || 0) + (Number(r.externalObtained) || 0),
        0,
      );
      const effectiveMarks =
        subjectResultRows.length > 0
          ? String(rowSum)
          : selectedExam.examMode === "online"
            ? String(resultForm.marks || selectedExam.totalScore || 0)
            : resultForm.marks;
      const formData = new FormData();
      formData.append("studentId", selectedExam.studentId?._id);
      formData.append("examId", selectedExam._id);
      formData.append("offlineExamStatus", submitStatus);
      formData.append("totalScore", effectiveMarks);
      formData.append("offlineExamResult", resultForm.resultStatus);
      const { grade: submitGrade } = gradeFromMarksOrSubjectRows(
        subjectResultRows,
        effectiveMarks,
        selectedExam.maxScore,
        resultGradeBands,
      );
      formData.append("grade", submitGrade);
      formData.append(
        "session",
        selectedExam.studentId?.session?.trim() || selectedExam.session?.trim() || "",
      );
      formData.append("examMode", selectedExam.examMode);
      if (subjectResultRows.length > 0) {
        formData.append("subjectMarks", JSON.stringify(subjectResultRows));
      }
      if (resultCopyFile) formData.append("examCopy", resultCopyFile);

      const res = await apiFetch("/api/atc/exams/offline-result", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({} as { message?: string }));
      if (!res.ok) {
        alert(data.message || "Unable to submit result right now.");
        return;
      }
      alert(data.message || "Result submitted successfully.");
      await fetchRequests();
      setShowResultModal(false);
    } catch (err) {
      console.error("Result save failed", err);
      alert("Result submit failed. Please try again.");
    } finally {
      setResultSaving(false);
    }
  };

  const handleApproveResult = async (
    examId: string,
    status: "published" | "appeared" = "published",
    release: { marksheet: boolean; certificate: boolean } = { marksheet: false, certificate: false },
  ) => {
    setActionLoading(examId);
    try {
      const res = await apiFetch("/api/admin/exams/approve-result", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ examId, status, marksheet: release.marksheet, certificate: release.certificate }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (err) {
      console.error("Approve failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedExams.length === 0) return;
    
    if (action === "approve") {
      setShowApproveModal(true);
      return; // The modal will handle the final batch submit
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedExams.length} requests?`)) return;

    setActionLoading("bulk");
    try {
      // In a real scenario, ideally a single bulk API endpoint. 
      // For now, loop or use a /bulk endpoint if it exists.
      for (const id of selectedExams) {
        await apiFetch("/api/admin/exams/update", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requestId: id, status: action === "reject" ? "rejected" : "delete" }),
        });
      }
      setSelectedExams([]);
      await fetchRequests();
    } catch (err) {
      console.error("Bulk action failed", err);
    } finally {
      setActionLoading(null);
    }
  };

  const openApproveModal = (exam: ExamRequest) => {
    setSelectedExam(exam);
    setApprovalForm({
      examDate: exam.examDate || "",
      setId: exam.setId || "",
      examMode: exam.examMode
    });
    setShowApproveModal(true);
  };

  const openResultModal = (exam: ExamRequest) => {
    if (role === "atc" && exam.examMode === "offline" && exam.examDate && exam.examTime) {
      const scheduled = new Date(`${exam.examDate}T${exam.examTime}:00`);
      if (!Number.isNaN(scheduled.getTime()) && Date.now() < scheduled.getTime()) {
        alert(`Result can be submitted after ${scheduled.toLocaleString("en-IN")}`);
        return;
      }
    }

    const autoResultStatus =
      exam.offlineExamResult ||
      (typeof exam.totalScore === "number" ? (exam.totalScore >= 33 ? "Pass" : "Fail") : "Pass");

    let initialRows: SubjectResultRow[] = [];
    if (Array.isArray(exam.subjectMarks) && exam.subjectMarks.length > 0) {
      initialRows = exam.subjectMarks.map((m) => ({
        subjectName: m.subjectName,
        internalObtained: Number(m.internalObtained ?? 0),
        internalMax: Number(m.internalMax ?? 0),
        externalObtained: Number(m.externalObtained ?? 0),
        externalMax: Number(m.externalMax ?? 0),
      }));
    } else if (Array.isArray(exam.courseSubjects) && exam.courseSubjects.length > 0) {
      const subs = exam.courseSubjects;
      initialRows = subs.map((s) => {
        let internalMax = Number(s.practicalMarks || 0);
        let externalMax = Number(s.theoryMarks || 0);
        const fullMarks = Number(s.fullMarks || internalMax + externalMax || 0);
        if (internalMax === 0 && externalMax === 0 && fullMarks > 0) {
          const d = deriveInternalExternalMax(fullMarks);
          internalMax = d.internalMax;
          externalMax = d.externalMax;
        }
        return {
          subjectName: s.name,
          internalObtained: 0,
          internalMax,
          externalObtained: 0,
          externalMax,
        };
      });
    }

    setSubjectResultRows(initialRows);

    const rowSum = initialRows.reduce(
      (s, r) => s + (Number(r.internalObtained) || 0) + (Number(r.externalObtained) || 0),
      0,
    );
    const marksStr =
      initialRows.length > 0
        ? String(rowSum)
        : exam.totalScore?.toString() || "";

    setSelectedExam(exam);
    setResultForm({
      status: "published",
      marks: marksStr,
      resultStatus: autoResultStatus as "Pass" | "Fail" | "Waiting",
    });
    setResultCopyFile(null);
    setShowResultModal(true);
  };

  const openOnlineAttemptReview = async (exam: ExamRequest) => {
    setOnlineAttemptExam(exam);
    setOnlineAttemptPayload(null);
    setOnlineAttemptLoading(true);
    try {
      const res = await apiFetch(`/api/atc/exams/${exam._id}/online-attempt`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.message === "string" ? data.message : "Could not load attempt.");
        setOnlineAttemptExam(null);
        return;
      }
      setOnlineAttemptPayload({
        items: Array.isArray(data.items) ? data.items : [],
        totalScore: Number(data.totalScore) || 0,
        maxScore: Number(data.maxScore) || 0,
        submittedAt: data.submittedAt ?? null,
      });
    } catch {
      alert("Could not load the student's paper.");
      setOnlineAttemptExam(null);
    } finally {
      setOnlineAttemptLoading(false);
    }
  };

  const updateSubjectScore = (
    index: number,
    field: "internalObtained" | "externalObtained",
    rawValue: string,
  ) => {
    setSubjectResultRows((prev) => {
      const next = prev.map((row, idx) => {
        if (idx !== index) return row;
        const cap = field === "internalObtained" ? row.internalMax : row.externalMax;
        const numeric = Math.max(0, Math.min(cap, Number(rawValue) || 0));
        return { ...row, [field]: numeric };
      });
      const newTotal = next.reduce(
        (sum, r) => sum + (Number(r.internalObtained) || 0) + (Number(r.externalObtained) || 0),
        0,
      );
      setResultForm((rf) => ({ ...rf, marks: String(newTotal) }));
      return next;
    });
  };

  useEffect(() => {
    if (!showResultModal || !selectedExam) return;
    let cancelled = false;
    fetch(`/api/public/settings?key=${MARKSHEET_GRADE_BANDS_KEY}`)
      .then((r) => r.json())
      .then((d: { value?: string | null }) => {
        if (!cancelled) setResultGradeBands(parseGradeBandsJson(d?.value ?? null));
      })
      .catch(() => {
        if (!cancelled) setResultGradeBands([...DEFAULT_MARKSHEET_GRADE_BANDS]);
      });
    return () => {
      cancelled = true;
    };
  }, [showResultModal, selectedExam?._id]);

  const derivedMarksGrade = useMemo(
    () =>
      selectedExam
        ? gradeFromMarksOrSubjectRows(
            subjectResultRows,
            resultForm.marks,
            selectedExam.maxScore,
            resultGradeBands,
          )
        : { pct: 0, grade: "—" },
    [selectedExam, subjectResultRows, resultForm.marks, resultGradeBands],
  );

  const filtered = requests.filter(r => {
    const matchesSearch = 
      r.studentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId?.enrollmentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.atcId?.trainingPartnerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = filterMode === "all" || r.examMode === filterMode;
    const matchesStatus = filterStatus === "all" || r.approvalStatus === filterStatus;
    return matchesSearch && matchesMode && matchesStatus;
  });

  const labelCls = "block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2";
  const inputCls = "w-full px-5 py-3 bg-slate-50 rounded-xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-green-500 transition";
  /** Offline / online result modal — wider, denser, professional (not all-caps). */
  const resultModalLabelCls =
    "block text-xs font-semibold text-slate-600 mb-1.5 tracking-tight";
  const resultModalInputCls =
    "w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg font-medium text-slate-900 shadow-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 outline-none transition";
  const resultModalHelperCls = "text-[11px] text-slate-500 leading-snug mt-1";

  return (
    <div className="bg-slate-50/30 rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-150 text-slate-800">
      {/* Top Tabs styling same as StudentManager */}
      <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-white">
        <button
          onClick={() => setAtcTab("new")}
          className={`px-4 py-3 text-sm font-bold transition-all relative ${atcTab === "new" ? "text-green-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <span className="flex items-center gap-2">
            {role === "admin" ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            {role === "admin" ? "Result Review" : "Draft Certificates"}
          </span>
          {atcTab === "new" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setAtcTab("history")}
          className={`px-4 py-3 text-sm font-bold transition-all relative ${atcTab === "history" ? "text-green-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <span className="flex items-center gap-2">
            {role === "admin" ? <ClipboardCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {role === "admin" ? "Verified Certificates" : "Certificate History"}
          </span>
          {atcTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full" />}
        </button>
      </div>

      <div className="p-6">
        {/* Search & Filter bar like StudentManager */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search student or enrollment no..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition font-bold text-slate-600"
            value={filterMode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterMode(e.target.value as "all" | "online" | "offline")}
          >
            <option value="all">All Modes</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
          <button onClick={fetchRequests} className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {atcTab === "new" ? (
          <div className="animate-in fade-in duration-300">
            {loading ? (
              <div className="p-6">
                <SkeletonLoader type="card" count={3} />
              </div>
            ) : requests.filter(r => r.approvalStatus === 'approved' && r.offlineExamStatus !== 'published').length === 0 ? (
              <div className="text-center p-24 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                 <div className="w-20 h-20 bg-blue-50 rounded-4xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ClipboardCheck className="w-10 h-10 text-blue-400" />
                 </div>
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">No Pending Certificates</h3>
                 <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">All candidate requests have been processed.</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Bulk Action Bar */}
                {selectedExams.length > 0 && role === "admin" && (
                  <div className="bg-slate-900 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-4 text-white text-xs font-bold">
                       <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">{selectedExams.length}</div>
                       <span className="uppercase tracking-widest">Requests Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button onClick={() => handleBulkAction("approve")} className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase hover:bg-emerald-600 transition shadow-lg">Approve Selective</button>
                       <button onClick={() => handleBulkAction("reject")} className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase hover:bg-amber-600 transition shadow-lg">Reject Selective</button>
                       <button onClick={() => setSelectedExams([])} className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase hover:bg-white/20 transition">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Enrollment no.</th>
                      <th className="px-6 py-4">Student Identity</th>
                      <th className="px-6 py-4">Opted Course</th>
                      <th className="px-6 py-4 text-center">Eligibility</th>
                      <th className="px-6 py-4">Result Preview</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.filter(r => r.approvalStatus === 'approved' && r.offlineExamStatus !== 'published').map(r => {
                      return (
                        <tr key={r._id} className="hover:bg-slate-50/50 transition cursor-default">
                          <td className="px-6 py-5">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                              checked={selectedExams.includes(r._id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedExams(prev => [...prev, r._id]);
                                else setSelectedExams(prev => prev.filter(id => id !== r._id));
                              }}
                            />
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                              {r.studentId?.enrollmentNo || "PENDING"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              {r.studentId?.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.studentId.photo} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 font-black text-slate-400">{r.studentId?.name?.charAt(0)}</div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 leading-none mb-1 uppercase text-xs">{r.studentId?.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{r.studentId?.mobile}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className="font-bold text-emerald-700 uppercase text-xs">{r.studentId?.course}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 text-[9px] font-black uppercase rounded-full border border-blue-200 tracking-widest shadow-sm">
                               {r.examMode}
                             </span>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex flex-col gap-0.5">
                                <p className="text-[10px] font-black text-slate-800 uppercase">Marks: <span className="text-emerald-600">{r.totalScore ?? 0}</span></p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Grade: {r.grade || '—'} | {r.session || '—'}</p>
                                {r.offlineExamCopy && (
                                  <button 
                                    onClick={() => {
                                      const win = window.open();
                                      const html = `<html><body style="margin:0"><embed src="${r.offlineExamCopy}" width="100%" height="100%" type="application/pdf"></body></html>`;
                                      win?.document.write(html);
                                    }}
                                    className="text-[9px] font-black text-blue-600 uppercase underline mt-1 text-left"
                                  >
                                    View Exam Copy
                                  </button>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2 text-slate-800 flex-wrap">
                                {role === "atc" && (
                                  <>
                                    {r.examMode === "online" && r.status === "completed" && (
                                      <button
                                        type="button"
                                        onClick={() => openOnlineAttemptReview(r)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm"
                                      >
                                        <ScrollText className="w-3.5 h-3.5" />
                                        View paper
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => openResultModal(r)}
                                      className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                                    >
                                      {r.examMode === "online" ? "Edit Exam Result" : "Enter Exam Result"}
                                    </button>
                                  </>
                                )}
                                {role === "admin" && r.examMode === "online" && r.status === "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => openOnlineAttemptReview(r)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm"
                                  >
                                    <ScrollText className="w-3.5 h-3.5" />
                                    View paper
                                  </button>
                                )}
                                {role === "admin" && (
                                  (r.offlineExamStatus === "review_pending") || 
                                  (r.examMode === "online" && r.status === "completed" && r.offlineExamStatus !== "published")
                                ) && (
                                  <>
                                    <button 
                                      onClick={() => { setSelectedExam(r); setShowReleaseModal(true); }}
                                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                                    >
                                      Approve & Issue
                                    </button>
                                    <button 
                                      onClick={() => handleApproveResult(r._id, "appeared")}
                                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase hover:bg-amber-200 transition"
                                    >
                                      Send Back
                                    </button>
                                  </>
                                )}
                                {role === "admin" && !(r.offlineExamStatus === "review_pending" || (r.examMode === "online" && r.status === "completed" && r.offlineExamStatus !== "published")) && (
                                   <span className="text-[9px] font-black italic text-slate-400 uppercase tracking-widest">
                                     {r.examMode === 'online' && r.status !== 'completed' ? 'Exam Not Started/Finished' : 'Waiting for ATC Action'}
                                   </span>
                                )}
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {loading ? (
               <div className="p-6">
                 <SkeletonLoader type="card" count={3} />
               </div>
            ) : filtered.length === 0 ? (
               <div className="bg-white p-24 text-center rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                  <div className="w-20 h-20 bg-emerald-50 rounded-4xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                     <Clock className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">No History Found</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">There are no verified certificates in the registry yet.</p>
               </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4 w-4">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                          checked={selectedExams.length > 0 && selectedExams.length === filtered.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedExams(filtered.map(r => r._id));
                            else setSelectedExams([]);
                          }}
                        />
                      </th>
                      <th className="px-6 py-4">Student Info</th>
                      {role === "admin" && <th className="px-6 py-4">Authorized Center</th>}
                      <th className="px-6 py-4 text-center">Mode</th>
                      <th className="px-6 py-4">Schedule / Center</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((exam) => (
                      <tr key={exam._id} className={selectedExams.includes(exam._id) ? 'bg-green-50/30' : ''}>
                        <td className="px-6 py-5">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                            checked={selectedExams.includes(exam._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedExams(prev => [...prev, exam._id]);
                              else setSelectedExams(prev => prev.filter(id => id !== exam._id));
                            }}
                          />
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-800 uppercase text-xs leading-none mb-1">{exam.studentId?.name || "N/A"}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{exam.studentId?.enrollmentNo || "—"}</p>
                        </td>
                        {role === "admin" && (
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-700 uppercase text-[10px] leading-tight mb-1">{exam.atcId?.trainingPartnerName || "N/A"}</p>
                            <p className="text-[10px] font-black text-blue-600 tracking-widest uppercase">ID: {exam.atcId?.tpCode || "—"}</p>
                          </td>
                        )}
                        <td className="px-6 py-5 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${
                            exam.examMode === 'online' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            {exam.examMode}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {exam.status === 'completed' ? (
                            <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-slate-400 uppercase">Attempt Completed</span>
                               <span className="text-xs font-bold text-slate-700">{new Date(exam.submittedAt || exam.updatedAt).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {exam.examDate ? (
                                <>
                                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" /> {new Date(exam.examDate).toLocaleDateString()}
                                  </p>
                                  {exam.examTime ? (
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                                      Time: {exam.examTime}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none italic">Waiting for schedule...</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                             exam.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                             exam.approvalStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                             exam.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                           }`}>
                             {exam.status === 'completed' ? 'COMPLETED' : exam.approvalStatus}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <div className="flex items-center justify-end gap-2 text-slate-800">
                             {role === "admin" && exam.approvalStatus === "pending" && (
                               <div className="flex gap-2">
                                 <button 
                                   onClick={() => openApproveModal(exam)}
                                   className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                                 >
                                   Approve
                                 </button>
                                 <button 
                                   onClick={() => handleAction(exam._id, "rejected")}
                                   className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase shadow-lg shadow-red-100 hover:bg-red-700 transition"
                                 >
                                   Reject
                                 </button>
                                 <button 
                                   onClick={() => { if(confirm('Delete request?')) handleAction(exam._id, "delete"); }}
                                   className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                             )}
                            {role === "atc" && exam.approvalStatus === "approved" && exam.offlineExamStatus !== "published" && (
                               <div className="flex flex-wrap items-center justify-end gap-2">
                                 {exam.examMode === "online" && exam.status === "completed" && (
                                   <button
                                     type="button"
                                     onClick={() => openOnlineAttemptReview(exam)}
                                     className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition uppercase shadow-sm"
                                   >
                                     <ScrollText className="w-3.5 h-3.5" />
                                     View paper
                                   </button>
                                 )}
                                 <button onClick={() => openResultModal(exam)} className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition uppercase shadow-sm">
                                   {exam.examMode === "online" ? "Edit Exam Result" : "Enter Exam Result"}
                                 </button>
                               </div>
                            )}
                            {role === "admin" && exam.offlineExamStatus === "review_pending" && (
                               <div className="flex items-center gap-2">
                                 <button 
                                   onClick={() => { setSelectedExam(exam); setShowReleaseModal(true); }}
                                   className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition uppercase shadow-sm"
                                 >
                                   Approve & Issue
                                 </button>
                                 <button onClick={() => handleApproveResult(exam._id, "appeared")} className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition uppercase shadow-sm">
                                   Send Back
                                 </button>
                               </div>
                            )}

                             {exam.status === 'completed' && (
                               <>
                                 <div className="flex flex-col gap-1.5">
                                   {role === "admin" && (
                                     <button
                                       onClick={() => { setSelectedExam(exam); setShowReleaseModal(true); }}
                                       className="text-[10px] font-black px-2 py-1 rounded bg-slate-900 text-white hover:bg-black transition uppercase whitespace-nowrap"
                                     >
                                       Issue Docs
                                     </button>
                                   )}
                                   {exam.examMode === "online" && (
                                     <button
                                       type="button"
                                       onClick={() => openOnlineAttemptReview(exam)}
                                       className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition uppercase"
                                     >
                                       <ScrollText className="w-3.5 h-3.5" />
                                       View paper
                                     </button>
                                   )}
                                   <div className="flex gap-1.5">
                                     <button
                                       onClick={() => window.open(`/${role}/document/marksheet/${exam._id}`, "_blank")}
                                       disabled={!exam.marksheetReleased}
                                       className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition uppercase shadow-sm ${
                                         exam.marksheetReleased 
                                           ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                                           : "bg-slate-50 text-slate-300 cursor-not-allowed opacity-50"
                                       }`}
                                     >
                                       M-Sheet
                                     </button>
                                     <button
                                       onClick={() => window.open(`/${role}/document/certificate/${exam._id}`, "_blank")}
                                       disabled={!exam.certificateReleased}
                                       className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition uppercase shadow-sm ${
                                         exam.certificateReleased 
                                           ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                                           : "bg-slate-50 text-slate-300 cursor-not-allowed opacity-50"
                                       }`}
                                     >
                                       Cert
                                     </button>
                                   </div>
                                 </div>
                               </>
                             )}
                            <div className="text-[10px] font-black uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-slate-600">
                              {exam.offlineExamStatus === "review_pending" ? "Pending Admin Review" : "Result Workflow"}
                            </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal overlays */}
      {showApproveModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
          <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finalize Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">Set the official exam date and time.</p>
                </div>
                <button onClick={() => setShowApproveModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Final Exam Mode</label>
                    <select 
                        className={inputCls}
                        value={approvalForm.examMode}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          setApprovalForm({ ...approvalForm, examMode: e.target.value as "online" | "offline" })
                        }
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={labelCls}>Final Exam Date</label>
                    <input 
                        type="date"
                        className={inputCls}
                        value={approvalForm.examDate}
                        onChange={(e) => setApprovalForm({...approvalForm, examDate: e.target.value})}
                    />
                  </div>
                </div>



                <div className="space-y-2">
                   <label className={labelCls}>Select Question Set</label>
                   <select 
                      className={inputCls}
                      value={approvalForm.setId}
                      onChange={(e) => setApprovalForm({...approvalForm, setId: e.target.value})}
                   >
                     <option value="">Choose Set</option>
                     {questionSets.map(set => (
                       <option key={set._id} value={set._id}>{set.title} ({set.questionCount}Q)</option>
                     ))}
                   </select>
                </div>

                <button 
                  onClick={async () => {
                    if (selectedExams.length > 0) {
                      setActionLoading("bulk");
                      try {
                        for (const id of selectedExams) {
                          await apiFetch("/api/admin/exams/update", {
                            method: "POST",
                            headers: { 
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ requestId: id, status: "approved", ...approvalForm, admitCardReleased: role === "admin" }),
                          });
                        }
                        setSelectedExams([]);
                        await fetchRequests();
                        setShowApproveModal(false);
                      } catch (err) { console.error(err); }
                      finally { setActionLoading(null); }
                    } else if (selectedExam) {
                      handleAction(selectedExam._id, "approved", { ...approvalForm, admitCardReleased: role === "admin" });
                    }
                  }}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
                >
                  {(actionLoading === "bulk" || actionLoading) ? "Processing..." : (role === "admin" ? "Approve & Release" : "Save Schedule Details")}
                </button>
             </div>
          </div>
        </div>
      )}

      {showResultModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-3 sm:p-4 text-slate-800">
          <div className="bg-white w-full max-w-4xl max-h-[min(92vh,880px)] rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="shrink-0 flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {selectedExam.examMode === "online" ? "Online exam result" : "Offline exam result"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  <span className="font-medium text-slate-700">{selectedExam.studentId?.name}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="tabular-nums">{selectedExam.studentId?.enrollmentNo}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 py-4">
              <form onSubmit={handleResultSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={resultModalLabelCls}>Exam status</label>
                    <select
                      className={resultModalInputCls}
                      value={resultForm.status}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setResultForm({ ...resultForm, status: e.target.value as ExamStatusForm })
                      }
                      disabled={role === "atc"}
                      required
                    >
                      <option value="not_appeared">Not appeared</option>
                      <option value="appeared">Attended</option>
                      <option value="published">Result published (sent for approval)</option>
                    </select>
                    {role === "atc" && (
                      <p className={`${resultModalHelperCls} text-emerald-700/90`}>
                        Submitted results go to admin for approval.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={resultModalLabelCls}>Final score *</label>
                    <input
                      className={`${resultModalInputCls} ${
                        subjectResultRows.length > 0 ? "bg-slate-50 text-slate-600 cursor-not-allowed" : ""
                      }`}
                      placeholder="e.g. 85"
                      value={resultForm.marks}
                      onChange={(e) => setResultForm({ ...resultForm, marks: e.target.value })}
                      readOnly={subjectResultRows.length > 0}
                      required
                    />
                    {subjectResultRows.length > 0 ? (
                      <p className={resultModalHelperCls}>
                        Auto-calculated from subject-wise marks below.
                      </p>
                    ) : selectedExam.examMode === "online" ? (
                      <p className={`${resultModalHelperCls} text-blue-700/80`}>
                        System recorded {resultForm.marks || 0} marks — you may edit.
                      </p>
                    ) : null}
                  </div>
                </div>

                {subjectResultRows.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">Subject marks (internal / external)</span>
                      <span className="text-[11px] text-slate-500 max-sm:w-full">
                        Same values print on the marksheet.
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-white/60">
                        <div className="col-span-4">Subject</div>
                        <div className="col-span-4 text-center">Internal (obt / max)</div>
                        <div className="col-span-4 text-center">External (obt / max)</div>
                      </div>
                      {subjectResultRows.map((row, idx) => (
                        <div
                          key={`${row.subjectName}-${idx}`}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 py-2 items-center bg-white"
                        >
                          <div className="sm:col-span-4 text-sm font-semibold text-slate-800 truncate">
                            {row.subjectName}
                          </div>
                          <div className="sm:col-span-4 flex items-center justify-between sm:justify-center gap-2">
                            <span className="text-[10px] font-medium text-slate-500 sm:hidden">Internal</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={row.internalMax}
                                value={row.internalObtained}
                                onChange={(e) => updateSubjectScore(idx, "internalObtained", e.target.value)}
                                className="w-16 sm:w-20 px-2 py-1.5 text-sm tabular-nums text-center border border-slate-200 rounded-md bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
                              />
                              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                                / {row.internalMax}
                              </span>
                            </div>
                          </div>
                          <div className="sm:col-span-4 flex items-center justify-between sm:justify-center gap-2">
                            <span className="text-[10px] font-medium text-slate-500 sm:hidden">External</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={row.externalMax}
                                value={row.externalObtained}
                                onChange={(e) => updateSubjectScore(idx, "externalObtained", e.target.value)}
                                className="w-16 sm:w-20 px-2 py-1.5 text-sm tabular-nums text-center border border-slate-200 rounded-md bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 outline-none"
                              />
                              <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                                / {row.externalMax}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`grid grid-cols-1 ${selectedExam.examMode === "offline" ? "lg:grid-cols-12" : "sm:grid-cols-1"} gap-4`}
                >
                  <div className={selectedExam.examMode === "offline" ? "lg:col-span-4" : ""}>
                    <label className={resultModalLabelCls}>Grade (auto from marks)</label>
                    <div className={`${resultModalInputCls} bg-slate-50/90`}>
                      <span className="text-base font-bold text-slate-900 tabular-nums">
                        {derivedMarksGrade.grade}
                      </span>
                      <p className={resultModalHelperCls + " mt-1"}>
                        {derivedMarksGrade.pct}% total — uses the grade scale from Admin → Settings.
                      </p>
                    </div>
                  </div>
                  {selectedExam.examMode === "offline" && (
                    <div className="lg:col-span-8">
                      <label className={resultModalLabelCls}>Answer copy (PDF or image)</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="w-full text-xs sm:text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 border border-dashed border-slate-200 rounded-lg px-3 py-2 bg-white"
                        onChange={(e) => setResultCopyFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="sm:w-auto w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resultSaving}
                    className="sm:w-auto w-full px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 transition shadow-sm"
                  >
                    {resultSaving ? "Submitting…" : "Submit result"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {onlineAttemptExam && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-3 sm:p-4 text-slate-800">
          <div className="bg-white w-full max-w-3xl max-h-[min(92vh,820px)] rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-indigo-600 shrink-0" />
                  Online exam — student paper
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700">{onlineAttemptExam.studentId?.name}</span>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {onlineAttemptExam.studentId?.enrollmentNo}
                </p>
                {onlineAttemptPayload && (
                  <p className="text-xs text-slate-600 mt-2 tabular-nums">
                    Score:{" "}
                    <span className="font-bold text-emerald-700">
                      {onlineAttemptPayload.totalScore} / {onlineAttemptPayload.maxScore}
                    </span>
                    {onlineAttemptPayload.submittedAt ? (
                      <span className="text-slate-400 ml-2">
                        · Submitted {new Date(onlineAttemptPayload.submittedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOnlineAttemptExam(null);
                  setOnlineAttemptPayload(null);
                }}
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {onlineAttemptLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-sm font-medium">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  Loading questions…
                </div>
              ) : onlineAttemptPayload && onlineAttemptPayload.items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">
                  No recorded answers for this attempt yet.
                </p>
              ) : (
                onlineAttemptPayload?.items.map((item) => (
                  <div
                    key={item.order}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                        Question {item.order}
                      </p>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.correct
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.correct ? "Correct" : "Wrong"} · {item.marksEarned}/{item.marks} pts
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">{item.questionText}</p>
                    <ul className="space-y-1.5">
                      {item.options.map((opt, oidx) => {
                        const isSelected = opt === item.selectedOption;
                        const isCorrect = opt === item.correctOption;
                        return (
                          <li
                            key={`${item.order}-${oidx}`}
                            className={`text-xs sm:text-sm px-3 py-2 rounded-lg border ${
                              isSelected && isCorrect
                                ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-900"
                                : isSelected && !isCorrect
                                  ? "border-rose-400 bg-rose-50 font-semibold text-rose-900"
                                  : isCorrect
                                    ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-100 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {opt}
                            {isSelected ? (
                              <span className="ml-2 text-[10px] font-black uppercase text-slate-500">
                                (student choice)
                              </span>
                            ) : null}
                            {isCorrect && !isSelected ? (
                              <span className="ml-2 text-[10px] font-black uppercase text-emerald-600">
                                (correct)
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOnlineAttemptExam(null);
                  setOnlineAttemptPayload(null);
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-black transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {requestExamStudent && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finalize Request</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{requestExamStudent.name} • {requestExamStudent.enrollmentNo}</p>
                 </div>
                 <button onClick={() => setRequestExamStudent(null)} className="p-2 bg-white rounded-full border border-slate-100 text-slate-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <form onSubmit={handleRequestExam} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-full">
                       <label className={labelCls}>Examination Mode *</label>
                       <select 
                         className={inputCls}
                         value={examReqForm.examMode}
                         onChange={e => setExamReqForm({...examReqForm, examMode: e.target.value})}
                         required
                       >
                          <option value="online">Online Examination</option>
                          <option value="offline">Offline Examination (Center Based)</option>
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className={labelCls}>Proposed Date *</label>
                       <input 
                         type="date"
                         className={inputCls}
                         required
                         value={examReqForm.examDate}
                         onChange={e => setExamReqForm({...examReqForm, examDate: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className={labelCls}>Proposed Time *</label>
                       <input 
                         type="time"
                         className={inputCls}
                         required
                         value={examReqForm.examTime}
                         onChange={e => setExamReqForm({...examReqForm, examTime: e.target.value})}
                       />
                    </div>

                    <div className="space-y-2">
                       <label className={labelCls}>Duration (Minutes) *</label>
                       <input 
                         type="number"
                         className={inputCls}
                         min={1}
                         max={600}
                         required
                         value={examReqForm.durationMinutes}
                         onChange={e => setExamReqForm({...examReqForm, durationMinutes: e.target.value})}
                       />
                    </div>

                    {examReqForm.examMode === "online" && (
                    <div className="space-y-2 col-span-full">
                       <label className={labelCls}>Select Question Set *</label>
                       <select 
                         className={inputCls}
                         value={examReqForm.setId}
                         onChange={e => setExamReqForm({...examReqForm, setId: e.target.value})}
                         required
                       >
                          <option value="">Choose Set</option>
                          {questionSets.map(set => (
                            <option key={set._id} value={set._id}>{set.title} ({set.questionCount}Q)</option>
                          ))}
                       </select>
                    </div>
                    )}

                    {examReqForm.examMode === 'offline' && (
                      <div className="space-y-2 col-span-full">
                         <label className={labelCls}>Preferred Center *</label>
                         <input 
                           className={inputCls}
                           placeholder="Center Name"
                           required
                           value={examReqForm.preferredCenter}
                           onChange={e => setExamReqForm({...examReqForm, preferredCenter: e.target.value})}
                         />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-4">
                     <button type="button" onClick={() => setRequestExamStudent(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs">Cancel</button>
                     <button type="submit" disabled={requesting} className="flex-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-black transition shadow-xl">
                       {requesting ? "Submitting..." : "Submit Request"}
                     </button>
                  </div>
              </form>
           </div>
        </div>
      )}
      {showReleaseModal && selectedExam && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Issue Documents</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Select what to release for {selectedExam.studentId?.name}</p>
                 </div>
                 <button onClick={() => setShowReleaseModal(false)} className="p-2 bg-white rounded-full border border-slate-100 text-slate-400">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-4">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition group">
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                         checked={releaseForm.marksheet}
                         onChange={e => setReleaseForm({...releaseForm, marksheet: e.target.checked})}
                       />
                       <div>
                          <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">Generate Marksheet</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none italic">Official Statement of Marks</p>
                       </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition group">
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                         checked={releaseForm.certificate}
                         onChange={e => setReleaseForm({...releaseForm, certificate: e.target.checked})}
                       />
                       <div>
                          <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">Generate Certificate</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none italic">Official Diploma Document</p>
                       </div>
                    </label>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowReleaseModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs">Cancel</button>
                    <button 
                      onClick={() => handleApproveResult(selectedExam._id, "published", releaseForm)}
                      disabled={actionLoading === selectedExam._id || (!releaseForm.marksheet && !releaseForm.certificate)}
                      className="flex-2 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs hover:bg-black transition shadow-xl disabled:opacity-50"
                    >
                      {actionLoading === selectedExam._id ? "Processing..." : "Process Release"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
