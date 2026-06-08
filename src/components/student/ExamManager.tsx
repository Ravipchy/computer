"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Calendar,
  Award,
  ShieldCheck,
} from "lucide-react";
import AdmitCard from "./AdmitCard";
import LiveExam from "./LiveExam";
import ExamCountdown from "@/components/common/ExamCountdown";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { buildExamWindow } from "@/lib/exam-schedule";
import { apiFetch } from "@/utils/api";
import { ISO_DATE_MAX_SCHEDULE, ISO_DATE_MIN, sanitizeIsoDateInput } from "@/lib/isoDate";

/** Minimal student shape for this dashboard (API returns lean doc). */
export type ExamManagerStudent = {
  _id: string;
  course?: string;
};

/** Row from `/api/student/exams/status` — fields used in UI only. */
export type StudentExamRow = {
  _id: string;
  examMode?: "online" | "offline";
  offlineExamStatus?: string;
  status?: string;
  resultDeclared?: boolean;
  marksheetReleased?: boolean;
  certificateReleased?: boolean;
  courseName?: string;
  approvalStatus?: string;
  examDate?: string;
  examTime?: string;
  offlineDetails?: { preferredDate?: string; preferredCenter?: string };
  admitCardReleased?: boolean;
  answers?: unknown[];
  offlineExamCopy?: string;
  durationMinutes?: number;
};

interface ExamManagerProps {
  student: ExamManagerStudent;
}

export default function ExamManager({ student }: ExamManagerProps) {
  const [exams, setExams] = useState<StudentExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [modeSelection, setModeSelection] = useState<"online" | "offline" | null>(null);
  const [offlineForm, setOfflineForm] = useState({
    preferredDate: "",
    preferredCenter: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedExam, setSelectedExam] = useState<StudentExamRow | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examInProgress, setExamInProgress] = useState<StudentExamRow | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/student/exams/status?studentId=${student._id}`);
      const data = await res.json();
      setExams((data.exams as StudentExamRow[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [student._id]);

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const submitRequest = async (mode: "online" | "offline") => {
    setSubmitting(true);
    try {
      const body = {
        studentId: student._id,
        examId: editingExamId,
        examMode: mode,
        ...(mode === "offline" ? offlineForm : {})
      };
      
      const res = await apiFetch("/api/student/exams/status", {
        method: editingExamId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(editingExamId ? "Exam request updated successfully!" : "Exam request submitted successfully!");
        setModeSelection(null);
        setEditingExamId(null);
        fetchExams();
      } else {
        alert(data.message || "Failed to process request");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4"><SkeletonLoader type="card" count={3} /></div>;

  const publishedExam = exams.find(e => e.offlineExamStatus === 'published' || (e.examMode === 'online' && e.status === 'completed' && e.resultDeclared));

  return (
    <div className="space-y-8">
      {/* Offline Request Form */}
      {(modeSelection === "offline" || (editingExamId && modeSelection)) && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <FileText className={modeSelection === 'online' ? "text-blue-600" : "text-emerald-600"} /> 
              {editingExamId ? `Update ${modeSelection} Details` : `${modeSelection === 'online' ? 'Online' : 'Offline'} Exam Request`}
            </h2>
            <button onClick={() => { setModeSelection(null); setEditingExamId(null); }} className="text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
          </div>

          {editingExamId && modeSelection === "online" ? (
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 font-bold text-blue-700 text-sm">
                You are switching to Online Mode. You can directly attempt the exam once saved.
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferred Exam Date</label>
                <input 
                  type="date" 
                  min={ISO_DATE_MIN}
                  max={ISO_DATE_MAX_SCHEDULE}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 transition"
                  value={offlineForm.preferredDate}
                  onChange={(e) =>
                    setOfflineForm({
                      ...offlineForm,
                      preferredDate: sanitizeIsoDateInput(e.target.value),
                    })}
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferred Center (ATC)</label>
                <input 
                  type="text" 
                  placeholder="Enter center name or code"
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 transition"
                  value={offlineForm.preferredCenter}
                  onChange={(e) => setOfflineForm({...offlineForm, preferredCenter: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            {editingExamId && (
              <select 
                value={modeSelection || ""}
                onChange={(e) => setModeSelection(e.target.value as "online" | "offline")}
                className="w-1/3 px-6 py-5 bg-slate-100 rounded-3xl font-black uppercase text-xs tracking-widest outline-none border-none"
              >
                <option value="online">Online Mode</option>
                <option value="offline">Offline Mode</option>
              </select>
            )}
            <button 
              disabled={submitting}
              onClick={() => submitRequest(modeSelection || "offline")}
              className="flex-1 py-5 bg-black text-white rounded-3xl font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-xl"
            >
              {submitting ? "Processing..." : (editingExamId ? "Update Request" : "Submit Request")}
            </button>
          </div>
        </section>
      )}

      {/* Official Credentials Section */}
      {publishedExam && (
        <section className="bg-linear-to-br from-slate-900 to-[#0a0a2e] rounded-[3rem] border border-white/10 shadow-2xl p-10 lg:p-14 animate-in fade-in zoom-in-95 duration-1000 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/20 mb-3">
                  <Award className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Formal Certification</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Official Credentials</h2>
                <p className="text-slate-400 font-medium mt-2">Download your authenticated academic documents.</p>
              </div>
              <ShieldCheck className="w-16 h-16 text-white/5 absolute -top-4 -right-4 lg:static lg:opacity-20" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-4xl flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-500">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="text-blue-400 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Academic Marksheet</h3>
                <p className="text-slate-400 text-xs mb-8 leading-relaxed">Comprehensive statement of marks including internal assessment and final examination scores.</p>
                {publishedExam.marksheetReleased ? (
                  <button 
                    onClick={() => window.open(`/student/document/marksheet/${publishedExam._id}`, '_blank')}
                    className="mt-auto w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-50 transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Download className="w-4 h-4" /> Download Marksheet
                  </button>
                ) : (
                  <div className="mt-auto w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-center italic">
                    Marksheet Not Released
                  </div>
                )}
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-4xl flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-500">
                <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Award className="text-amber-400 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Final Certificate</h3>
                <p className="text-slate-400 text-xs mb-8 leading-relaxed">Officially recognized diploma for the successful completion of the {publishedExam.courseName || student.course} program.</p>
                {publishedExam.certificateReleased ? (
                  <button 
                    onClick={() => window.open(`/student/document/certificate/${publishedExam._id}`, '_blank')}
                    className="mt-auto w-full py-4 bg-amber-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-amber-400 transition active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Download className="w-4 h-4" /> Download Certificate
                  </button>
                ) : (
                  <div className="mt-auto w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-center italic">
                    Certificate Not Released
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-[100px] -ml-32 -mb-32" />
        </section>
      )}

      {/* My Exams Records Table */}
      {exams.length > 0 && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8 sm:p-10">
          <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <Calendar className="text-blue-600" /> My Examination Records
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left">
                  <th className="px-6 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</th>
                  <th className="px-6 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date & Time</th>
                  <th className="px-6 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Admit Card</th>
                  <th className="px-6 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam._id} className="group hover:scale-[1.01] transition-transform">
                    <td className="px-6 py-5 bg-slate-50/50 rounded-l-3xl">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        exam.examMode === 'online' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {exam.examMode}
                      </span>
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50">
                      {exam.approvalStatus === "approved" ? (
                        <>
                          <p className="text-sm font-bold text-slate-800">
                            {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : "TBD"}
                          </p>
                          {exam.examTime && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{exam.examTime}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Visible after admin approval</p>
                      )}
                      {exam.examMode === "offline" && (
                        <p className="text-[10px] font-bold text-slate-500 mt-1">
                          Center: {exam.offlineDetails?.preferredCenter || "Assigned ATC Center"}
                        </p>
                      )}

                    </td>
                    <td className="px-6 py-5 bg-slate-50/50">
                       <span className={`flex items-center gap-1.5 text-xs font-black uppercase ${
                        exam.approvalStatus === 'approved' ? 'text-green-600' : 
                        exam.approvalStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {exam.approvalStatus === 'pending' && <Clock size={12} />}
                        {exam.approvalStatus === 'approved' && <CheckCircle size={12} />}
                        {exam.approvalStatus === 'rejected' && <AlertCircle size={12} />}
                        {exam.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50">
                      {exam.admitCardReleased ? (
                        <button 
                          onClick={() => setSelectedExam(exam)}
                          className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:underline decoration-2 underline-offset-4"
                        >
                          <Download size={14} /> View
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Not Released</span>
                      )}
                    </td>
                    <td className="px-6 py-5 bg-slate-50/50 rounded-r-3xl">
                      <div className="flex items-center gap-3">
                         {exam.approvalStatus === 'approved' && exam.status === 'pending' && exam.examMode === 'online' && (
                           <div className="flex flex-col items-start gap-1">
                             {(() => {
                                const now = new Date(nowTs);
                                const { startsAt, endsAt } = buildExamWindow(exam, now);
                                if (!startsAt) {
                                  return <span className="text-[9px] font-bold text-red-500 italic">Exam date/time not assigned</span>;
                                }
                                if (startsAt.getTime() > now.getTime()) {
                                  return <ExamCountdown targetAt={startsAt} />;
                                }
                                if (endsAt && endsAt.getTime() <= now.getTime()) {
                                  return <span className="text-[9px] font-bold text-red-500 italic">Exam window closed</span>;
                                }
                                return (
                                  <button onClick={() => setExamInProgress(exam)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition">Start Exam</button>
                                );
                             })()}
                           </div>
                         )}
                         {exam.approvalStatus === 'approved' && exam.status === 'pending' && exam.examMode === 'offline' && (
                           <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-slate-500">Offline exam at your center</span>
                             <span className="text-[9px] font-bold text-slate-400">No start button required</span>
                           </div>
                         )}
                        {exam.status === 'completed' && (
                           <div className="flex flex-col gap-2">
                             <span className="text-xs font-black text-slate-800">
                               {`${Array.isArray(exam.answers) ? exam.answers.length : 0} Questions Attempted`}
                             </span>
                             {exam.examMode === 'offline' && exam.offlineExamCopy && (
                               <button 
                                 onClick={() => {
                                   const win = window.open();
                                   win?.document.write(`<html><body style="margin:0"><iframe src="${exam.offlineExamCopy}" frameborder="0" style="border:0; width:100%; height:100vh;" allowfullscreen></iframe></body></html>`);
                                 }}
                                 className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition text-[10px] font-black uppercase"
                               >
                                 <FileText size={12} className="text-orange-600" />
                                 View Answer Copy
                               </button>
                             )}
                           </div>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedExam && (
        <AdmitCard 
          student={student} 
          exam={selectedExam} 
          onClose={() => setSelectedExam(null)} 
        />
      )}

      {examInProgress && (
        <LiveExam 
          exam={examInProgress}
          student={student}
          onFinish={() => {
            setExamInProgress(null);
            fetchExams();
          }}
        />
      )}
    </div>
  );
}
