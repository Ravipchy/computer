"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { BookOpen, PlusCircle, Trash2, CheckCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import SkeletonLoader from "@/components/common/SkeletonLoader";

interface ExamSet {
  _id: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  totalMarks: number;
  examMode: "online" | "offline" | "both";
  isActive: boolean;
  createdAt: string;
}

interface ExamQuestion {
  _id: string;
  setId: string;
  questionText: string;
  options: string[];
  correctOption: string;
  marks: number;
  isActive: boolean;
}

interface ExamSetManagerProps {
  role: "admin" | "atc";
}

interface PendingStudentExam {
  _id: string;
  examMode: "online" | "offline";
  studentId?: {
    name?: string;
    enrollmentNo?: string;
  };
}

export default function ExamSetManager({ role }: ExamSetManagerProps) {
  const [sets, setSets] = useState<ExamSet[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [loadingSets, setLoadingSets] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newSet, setNewSet] = useState({ title: "", description: "", questionCount: "100", durationMinutes: "120", totalMarks: "100", examMode: "both" });
  const [questionForm, setQuestionForm] = useState({ questionText: "", options: ["", "", "", ""], correctOption: "", marks: "1" });
  const [creatingSet, setCreatingSet] = useState(false);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [subTab, setSubTab] = useState<"questions" | "assign">("questions");
  const [pendingStudents, setPendingStudents] = useState<PendingStudentExam[]>([]);
  const [assignForm, setAssignForm] = useState({ date: "", time: "10:00 AM", mode: "online" });
  const [assigning, setAssigning] = useState(false);
  const [selectedStudentExams, setSelectedStudentExams] = useState<string[]>([]);
  const { loading: authLoading, user: authUser } = useAuth();

  const apiBase = role === "admin" ? "/api/admin" : "/api/atc";

  const selectedSet = useMemo(
    () => sets.find((set) => set._id === selectedSetId) ?? null,
    [sets, selectedSetId],
  );

  const fetchSets = useCallback(async () => {
    if (authLoading || !authUser) return;
    setLoadingSets(true);
    try {
      const res = await apiFetch(`${apiBase}/question-sets`);
      if (!res.ok) throw new Error("Unable to load exam sets.");
      const data = await res.json();
      setSets(data.sets ?? []);
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load exam sets." });
    } finally {
      setLoadingSets(false);
    }
  }, [authLoading, authUser, apiBase]);

  const fetchQuestions = useCallback(async (setId: string) => {
    if (authLoading || !authUser) return;
    try {
      const res = await apiFetch(`${apiBase}/questions?setId=${encodeURIComponent(setId)}`);
      if (!res.ok) throw new Error("Unable to load questions.");
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      setQuestions([]);
    }
  }, [authLoading, authUser, apiBase]);

  const fetchPendingStudents = useCallback(async () => {
    if (authLoading || !authUser) return;
    try {
      const res = await apiFetch("/api/admin/exams/all?status=pending");
      const data = await res.json();
      setPendingStudents(data.exams || []);
    } catch { /* ignore */ }
  }, [authLoading, authUser]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    void fetchSets();
  }, [authLoading, authUser, fetchSets]);

  useEffect(() => {
    if (selectedSetId) {
      void fetchQuestions(selectedSetId);
    } else {
      setQuestions([]);
    }
  }, [selectedSetId, fetchQuestions]);

  useEffect(() => {
    if (subTab === "assign") void fetchPendingStudents();
  }, [subTab, fetchPendingStudents]);

  const handleCreateSet = async () => {
    if (!newSet.title.trim()) return;
    setCreatingSet(true);
    try {
      const res = await apiFetch(`${apiBase}/question-sets`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newSet.title.trim(),
          questionCount: Number(newSet.questionCount) || 100,
          durationMinutes: Number(newSet.durationMinutes) || 120,
          totalMarks: Number(newSet.totalMarks) || 100,
          examMode: newSet.examMode,
        }),
      });
      if (res.ok) {
        setNewSet({ title: "", description: "", questionCount: "100", durationMinutes: "120", totalMarks: "100", examMode: "both" });
        await fetchSets();
      }
    } finally {
      setCreatingSet(false);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!selectedSetId) return;
    setCreatingQuestion(true);
    try {
      await apiFetch(`${apiBase}/questions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setId: selectedSetId,
          questionText: questionForm.questionText.trim(),
          options: questionForm.options.filter((opt) => opt.trim()),
          correctOption: questionForm.correctOption.trim(),
          marks: Number(questionForm.marks) || 1,
        }),
      });
      setQuestionForm({ questionText: "", options: ["", "", "", ""], correctOption: "", marks: "1" });
      await fetchQuestions(selectedSetId);
    } finally {
      setCreatingQuestion(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question?")) return;
    await apiFetch(`${apiBase}/questions?id=${encodeURIComponent(questionId)}`, { 
      method: "DELETE",
    });
    if (selectedSetId) await fetchQuestions(selectedSetId);
  };

  const handleBulkAssign = async (studentExamIds: string[]) => {
    setAssigning(true);
    try {
      for (const id of studentExamIds) {
        await apiFetch("/api/admin/exams/approve", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            examId: id, 
            approvalStatus: "approved", 
            examDate: assignForm.date, 
            examTime: assignForm.time, 
            examMode: assignForm.mode,
            setId: selectedSetId,
            admitCardReleased: true 
          })
        });
      }
      setStatusMessage({ type: "success", text: `Successfully assigned set to ${studentExamIds.length} students.` });
      fetchPendingStudents();
    } catch {
      setStatusMessage({ type: "error", text: "Some assignments failed." });
    } finally {
      setAssigning(false);
    }
  };

  const questionsForSet = useMemo(
    () => questions.filter((question) => question.setId === selectedSetId),
    [questions, selectedSetId],
  );

  return (
    <div className="mx-auto max-w-400 space-y-6 p-1 md:space-y-8">
      <div className="flex flex-col gap-4 rounded-4xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-900 sm:gap-4 sm:text-3xl">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200 sm:h-12 sm:w-12 sm:rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-white" />
             </div>
             <div>
                Paper Designer & Exam Controller
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-sm sm:tracking-widest">Global Examination Management System</span>
             </div>
          </h2>
        </div>
        <button
          onClick={fetchSets}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" /> REFRESH SYSTEM
        </button>
      </div>

      {statusMessage && (
        <div className={`rounded-2xl px-6 py-4 text-sm font-bold animate-in bounce-in duration-300 ${statusMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_1fr] xl:gap-8">
        <div className="space-y-8">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
               <PlusCircle className="text-blue-600" /> Create Paper Set
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Title</label>
                <input
                  value={newSet.title}
                  onChange={(e) => setNewSet((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g. Computer Science Part-1"
                />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Duration</label>
                   <input
                     type="number"
                     value={newSet.durationMinutes}
                     onChange={(e) => setNewSet((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                     className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 text-sm font-bold"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Max Marks</label>
                   <input
                     type="number"
                     value={newSet.totalMarks}
                     onChange={(e) => setNewSet((prev) => ({ ...prev, totalMarks: e.target.value }))}
                     className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 text-sm font-bold"
                   />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Exam Mode</label>
                 <select 
                   value={newSet.examMode}
                   onChange={(e) => setNewSet((prev) => ({ ...prev, examMode: e.target.value }))}
                   className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 text-sm font-bold"
                 >
                   <option value="both">Online & Offline</option>
                   <option value="online">Online Only</option>
                   <option value="offline">Offline Only</option>
                 </select>
              </div>
              <button
                onClick={handleCreateSet}
                disabled={creatingSet}
                className="w-full rounded-2xl bg-slate-900 px-5 py-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800 shadow-xl active:scale-95"
              >
                {creatingSet ? "Processing..." : "Generate Set"}
              </button>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center justify-between">
               Question Papers
               <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{sets.length} Papers</span>
            </h3>
            <div className="space-y-4 max-h-150 overflow-y-auto pr-2 custom-scrollbar">
              {loadingSets ? (
                 <div className="p-4"><SkeletonLoader type="card" count={2} /></div>
              ) : sets.map((set) => (
                <button
                  key={set._id}
                  onClick={() => setSelectedSetId(set._id)}
                  className={`w-full group text-left p-5 rounded-3xl border-2 transition-all duration-300 ${
                    selectedSetId === set._id 
                    ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-100 -translate-y-1" 
                    : "bg-white border-slate-50 hover:border-slate-200"}`}
                >
                  <p className={`font-black uppercase text-sm tracking-tight ${selectedSetId === set._id ? "text-white" : "text-slate-800"}`}>
                    {set.title}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      selectedSetId === set._id ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                    }`}>
                      {set.examMode}
                    </span>
                    <span className={`text-[10px] font-bold ${selectedSetId === set._id ? "text-blue-100" : "text-slate-400"}`}>
                      {set.questionCount} Questions • {set.totalMarks} Marks
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {selectedSet ? (
            <div className="flex h-full min-h-180 flex-col overflow-hidden rounded-4xl border border-slate-100 bg-white shadow-sm sm:min-h-200 sm:rounded-[3rem]">
              <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 p-2 sm:flex-row sm:gap-3 sm:p-3">
                 <button 
                  onClick={() => setSubTab("questions")}
                  className={`flex-1 rounded-2xl py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all sm:py-4 sm:tracking-[0.2em] ${
                    subTab === "questions" ? "bg-white text-blue-600 shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Step 1: Build Paper Set
                </button>
                <button 
                  onClick={() => setSubTab("assign")}
                  className={`flex-1 rounded-2xl py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all sm:py-4 sm:tracking-[0.2em] ${
                    subTab === "assign" ? "bg-white text-emerald-600 shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Step 2: Assign & Deploy
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
                 {subTab === "questions" ? (
                   <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex flex-col gap-4 rounded-3xl bg-linear-to-r from-slate-900 to-slate-800 p-5 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:rounded-4xl sm:p-8">
                         <div>
                            <h4 className="text-lg font-black uppercase tracking-tight sm:text-2xl">{selectedSet.title}</h4>
                            <div className="mt-3 flex flex-wrap gap-2 sm:gap-4">
                               <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase">Mode: {selectedSet.examMode}</span>
                               <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase">{questionsForSet.length} OF {selectedSet.questionCount} QUESTION ADDED</span>
                            </div>
                         </div>
                         <div className="text-left sm:text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Time Assigned</p>
                            <p className="text-2xl font-black">{selectedSet.durationMinutes}m</p>
                         </div>
                      </div>

                      <div className="flex flex-col gap-12 max-w-4xl mx-auto w-full">
                         <div className="space-y-10 bg-white p-8 sm:p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20">
                            <div className="space-y-4">
                               <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Question Content</label>
                               <textarea
                                  rows={4}
                                  className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 px-5 py-5 text-base font-bold text-slate-800 shadow-inner outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:rounded-[2.5rem] sm:px-8 sm:py-7 sm:text-xl"
                                  placeholder="Type your question here..."
                                  value={questionForm.questionText}
                                  onChange={(e) => setQuestionForm({...questionForm, questionText: e.target.value})}
                               />
                            </div>

                            <div className="space-y-6">
                               <div className="flex items-center justify-between px-1">
                                  <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Multiple Choice Options</label>
                                  <span className="text-[9px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest border border-red-100 italic">Click the option to mark as Correct</span>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {questionForm.options.map((opt, i) => (
                                    <div key={i} className="relative group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i*100}ms` }}>
                                       <div className={`absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-colors ${
                                         questionForm.correctOption === opt && opt.trim() !== "" 
                                           ? "bg-red-500 text-white shadow-lg shadow-red-200" 
                                           : "bg-slate-200 text-slate-500"
                                       }`}>
                                          {String.fromCharCode(65+i)}
                                       </div>
                                       <input 
                                         value={opt}
                                         onChange={(e) => {
                                           const newVal = e.target.value;
                                           const oldVal = questionForm.options[i];
                                           const nextOptions = [...questionForm.options];
                                           nextOptions[i] = newVal;
                                           setQuestionForm({
                                             ...questionForm, 
                                             options: nextOptions,
                                             correctOption: (questionForm.correctOption === oldVal && oldVal !== "") ? newVal : questionForm.correctOption
                                           });
                                         }}
                                         placeholder={`Option ${String.fromCharCode(65+i)}`}
                                         className={`w-full pl-16 pr-12 py-5 bg-white border-2 rounded-3xl font-bold text-slate-700 outline-none transition-all ${
                                           questionForm.correctOption === opt && opt.trim() !== "" 
                                             ? "border-red-500 ring-4 ring-red-50 bg-red-50/20" 
                                             : "border-slate-100 focus:border-blue-400 group-hover:border-slate-200"
                                         }`}
                                       />
                                       <button 
                                         type="button"
                                         onClick={() => opt.trim() && setQuestionForm({...questionForm, correctOption: opt})}
                                         className={`absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                           questionForm.correctOption === opt && opt.trim() !== "" 
                                             ? "bg-red-500 text-white" 
                                             : "bg-slate-100 text-slate-300 hover:text-red-400"
                                         }`}
                                       >
                                         <CheckCircle size={14} />
                                       </button>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            <div className="flex flex-col gap-4 rounded-4xl border border-slate-200 bg-slate-100/50 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                               <div className="flex flex-1 items-center gap-4 sm:gap-6">
                                  <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Question Value</p>
                                    <div className="flex items-center gap-3">
                                       <span className="text-[10px] font-black text-slate-400">POINTS:</span>
                                       <input 
                                         type="number" 
                                         className="w-20 bg-white px-4 py-2 rounded-xl border-2 border-slate-200 font-black text-slate-800 outline-none focus:border-blue-500 shadow-sm" 
                                         value={questionForm.marks}
                                         onChange={(e) => setQuestionForm({...questionForm, marks: e.target.value})}
                                       />
                                    </div>
                                  </div>
                               </div>
                               <button 
                                 onClick={handleQuestionSubmit}
                                 disabled={creatingQuestion || !questionForm.correctOption || !questionForm.questionText.trim()}
                                 className="w-full rounded-3xl bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-black active:scale-95 disabled:grayscale disabled:opacity-30 sm:w-auto sm:px-12 sm:py-5"
                               >
                                 {creatingQuestion ? "SAVING..." : "DEPLOY QUESTION"}
                               </button>
                            </div>
                         </div>

                         <div className="space-y-6 pt-10 border-t-2 border-slate-100 border-dashed">
                            <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 ml-1 text-center">Paper Preview / Added Questions</h5>
                            <div className="custom-scrollbar max-h-200 overflow-y-auto">
                               {questionsForSet.length === 0 ? (
                                  <div className="py-20 text-center text-slate-300 font-bold italic px-10 rounded-[2.5rem] border border-slate-100 bg-slate-50/50">No questions added to this set yet.</div>
                               ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                     {questionsForSet.map((q, i) => (
                                      <div key={q._id} className="p-6 sm:p-8 bg-white rounded-4xl border border-slate-200 shadow-sm relative group hover:shadow-lg hover:border-blue-200 transition-all">
                                          <p className="font-bold text-slate-800 leading-tight mb-5 pr-6 text-sm sm:text-base">
                                             <span className="text-blue-500 mr-2 font-black">Q{i+1}.</span> {q.questionText}
                                          </p>
                                          <div className="grid grid-cols-1 gap-2.5">
                                             {q.options.map((o, j) => (
                                               <div key={j} className={`text-[11px] px-4 py-3 rounded-xl border ${o === q.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-black' : 'bg-slate-50 border-slate-100 text-slate-600 font-semibold'} transition-colors`}>
                                                 {String.fromCharCode(65+j)}. {o}
                                               </div>
                                             ))}
                                          </div>
                                          <button 
                                             onClick={() => deleteQuestion(q._id)}
                                             className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors hover:scale-110"
                                          >
                                             <Trash2 size={18} />
                                          </button>
                                       </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
                      <div className="bg-emerald-50/30 border-2 border-emerald-100/50 p-10 rounded-[3rem] flex flex-wrap items-end gap-8">
                        <div className="flex-1 min-w-75 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-2">Final Assignment Mode</label>
                            <select 
                               className="w-full px-8 py-5 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm outline-none"
                               value={assignForm.mode}
                               onChange={(e) => setAssignForm({...assignForm, mode: e.target.value})}
                            >
                               <option value="online">Cloud-Based Online Exam</option>
                               <option value="offline">Center-Based Offline Paper</option>
                            </select>
                         </div>
                        <div className="flex-1 min-w-75 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-2">Execution Date</label>
                            <input 
                               type="date" 
                               className="w-full px-8 py-5 bg-white rounded-2xl border-none font-bold text-slate-800 shadow-sm outline-none"
                               value={assignForm.date}
                               onChange={(e) => setAssignForm({...assignForm, date: e.target.value})}
                            />
                         </div>
                         <button 
                           onClick={() => handleBulkAssign(selectedStudentExams)}
                           disabled={assigning || selectedStudentExams.length === 0}
                           className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                         >
                           {assigning ? "DEPLOYING..." : `DEPLOY TO ${selectedStudentExams.length} SELECTED`}
                         </button>
                      </div>

                      <div className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-4">
                               <input 
                                 type="checkbox"
                                 className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                 checked={pendingStudents.length > 0 && selectedStudentExams.length === pendingStudents.length}
                                 onChange={(e) => {
                                   if (e.target.checked) setSelectedStudentExams(pendingStudents.map(p => p._id));
                                   else setSelectedStudentExams([]);
                                 }}
                               />
                               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Queue: Students Awaiting Assignment</h5>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold">{pendingStudents.length} IN QUEUE</span>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingStudents.length === 0 ? (
                               <div className="md:col-span-2 py-32 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                                  <RefreshCw className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                  <p className="text-slate-300 font-black uppercase tracking-widest text-sm italic">Clear Queue: No pending exam requests</p>
                               </div>
                            ) : (
                               pendingStudents.map(s => (
                                  <div key={s._id} className={`group p-6 rounded-3xl border-2 transition-all flex gap-4 ${selectedStudentExams.includes(s._id) ? 'border-emerald-500 bg-emerald-50/20' : 'border-transparent bg-slate-50 hover:border-blue-100 hover:bg-white'}`}>
                                     <div className="pt-1">
                                        <input 
                                          type="checkbox"
                                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                          checked={selectedStudentExams.includes(s._id)}
                                          onChange={(e) => {
                                            if (e.target.checked) setSelectedStudentExams(prev => [...prev, s._id]);
                                            else setSelectedStudentExams(prev => prev.filter(id => id !== s._id));
                                          }}
                                        />
                                     </div>
                                     <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                           <div>
                                              <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{s.studentId?.name}</p>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enrollment no. {s.studentId?.enrollmentNo}</p>
                                           </div>
                                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                             s.examMode === 'online' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                           }`}>
                                              {s.examMode} REQUESTED
                                           </span>
                                        </div>
                                        <div className="mt-6 flex items-center gap-2">
                                           <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                              <div className="h-full w-1/3 bg-blue-500 rounded-full animate-progress" />
                                           </div>
                                           <span className="text-[8px] font-black text-slate-300 uppercase">Awaiting Set</span>
                                        </div>
                                     </div>
                                  </div>
                               ))
                            )}
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-40 bg-white rounded-[4rem] border border-dashed border-slate-100 h-full min-h-200">
               <div className="w-24 h-24 bg-slate-50 rounded-4xl flex items-center justify-center mb-10">
                  <BookOpen className="w-10 h-10 text-slate-200" />
               </div>
               <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-base mb-2">Paper Designer Workspace</p>
               <p className="text-slate-400 font-bold text-sm">Select a question paper from the left panel to begin construction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
