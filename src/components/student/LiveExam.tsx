"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ChevronLeft, ChevronRight, CheckCircle, 
  Clock, AlertCircle, Maximize2, Flag,
  Shield, Timer, Bookmark, HelpCircle,
  Menu, X
} from "lucide-react";
import { apiFetch } from "@/utils/api";

interface Question {
  _id: string;
  questionText: string;
  options: string[];
  correctOption: string;
  marks: number;
}

interface LiveExamProps {
  exam: any;
  student: any;
  onFinish: () => void;
}

export default function LiveExam({ exam, student, onFinish }: LiveExamProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    fetchQuestions();
    setTimeLeft((exam.durationMinutes || exam.setId?.durationMinutes || 60) * 60);
  }, [exam]);

  useEffect(() => {
    if (timeLeft <= 0 && !loading && !isSubmitting) {
      handleSubmit(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, isSubmitting]);

  const fetchQuestions = async () => {
    try {
      const setId = exam.setId?._id || exam.setId;
      const res = await apiFetch(`/api/student/exams/questions?setId=${setId}&examId=${exam._id}&studentId=${student._id}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Unable to start exam right now.");
        onFinish();
        return;
      }
      setQuestions(data.questions || []);
      if (typeof data.timeLeftSeconds === "number") {
        setTimeLeft(Math.max(0, data.timeLeftSeconds));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [questions[currentIndex]._id]: option });
  };

  const toggleReview = () => {
    const qId = questions[currentIndex]._id;
    setMarkedForReview(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleSubmit = async (auto = false) => {
    if (isSubmitting) return;
    if (!auto && !confirm("Finalize and submit your exam paper?")) return;
    
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/student/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam._id,
          studentId: student._id,
          answers: answers
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (!auto) alert("Exam submitted successfully!");
        onFinish();
      } else {
        alert(data.message || "Submission failed.");
      }
    } catch (err) {
      alert("Submission error. Contact admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0a0a1a] z-[2000] flex flex-col items-center justify-center p-10">
       <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
       <p className="text-sm font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Establishing Secure Session...</p>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-[#f4f7fe] z-[1000] flex flex-col font-sans overflow-hidden select-none">
      {/* Header - Compact & Premium */}
      <header className="h-14 bg-[#0a0a2e] px-6 flex items-center justify-between shadow-2xl relative z-[1100]">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => {
                if(confirm("Are you sure you want to quit the exam? Your progress will not be saved.")) {
                  onFinish();
                }
             }}
             className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all mr-2"
             title="Quit Exam"
           >
              <ChevronLeft size={20} />
           </button>
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg transform rotate-3">
              <Shield className="text-white w-4 h-4" />
           </div>
           <div className="hidden sm:block">
              <h1 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{exam.setId?.title || "Online Examination"}</h1>
              <p className="text-[9px] font-bold text-blue-400 uppercase mt-1 leading-none">{student.enrollmentNo} • {student.name}</p>
           </div>
        </div>

        <div className="flex items-center gap-6">
           <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 ${timeLeft < 300 ? 'bg-red-500/20 animate-pulse text-red-400' : 'bg-white/5 text-blue-100'}`}>
              <Clock size={14} />
              <span className="text-xs font-black tracking-tighter">{formatTime(timeLeft)}</span>
           </div>
           
           <button 
             onClick={() => handleSubmit(false)}
             className="px-6 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
           >
             SUBMIT EXAM
           </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden">
        {/* Question Area - Sexy & Focused */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 custom-scrollbar">
           <div className="max-w-[800px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                 <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Section: General Proficiency</p>
                 </div>
                 <div className="flex gap-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Weight: {currentQuestion?.marks || 1}M</span>
                    <button 
                      onClick={toggleReview}
                      className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-colors ${markedForReview[currentQuestion?._id] ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      <Bookmark size={12} fill={markedForReview[currentQuestion?._id] ? 'currentColor' : 'none'} /> Review Later
                    </button>
                 </div>
              </div>

              <div className="space-y-8">
                 <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
                   {currentQuestion?.questionText}
                 </h2>

                 <div className="grid grid-cols-1 gap-4">
                   {currentQuestion?.options.map((option, i) => {
                     const isSelected = answers[currentQuestion._id] === option;
                     return (
                       <button 
                         key={i}
                         onClick={() => handleSelect(option)}
                         className={`group flex items-center gap-5 p-5 rounded-2xl border-2 transition-all duration-200 text-left relative overflow-hidden ${
                            isSelected 
                            ? 'bg-blue-600 border-blue-600 shadow-xl shadow-blue-100 -translate-y-1' 
                            : 'bg-white border-slate-100 hover:border-blue-200 active:scale-[0.98]'
                         }`}
                       >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-sm transition-colors ${
                            isSelected ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                          }`}>
                             {String.fromCharCode(65 + i)}
                          </div>
                          <span className={`text-base font-bold transition-colors ${
                            isSelected ? 'text-white' : 'text-slate-600'
                          }`}>
                            {option}
                          </span>
                          {isSelected && (
                            <div className="absolute top-0 right-0 p-2">
                               <CheckCircle className="text-white/40 w-4 h-4" />
                            </div>
                          )}
                       </button>
                     );
                   })}
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar - Compact Palette */}
        <div className={`w-[280px] bg-white border-l border-slate-100 p-6 flex flex-col shrink-0 transition-transform ${showNav ? 'translate-x-0' : 'translate-x-full hidden lg:flex'}`}>
           <div className="space-y-6 flex flex-col h-full">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex justify-between items-center mb-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exam Progress</p>
                    <span className="text-[9px] font-black text-blue-600">{Math.round(progress)}%</span>
                 </div>
                 <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progress}%` }} />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Palette</p>
                 <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, idx) => {
                      const isCurrent = currentIndex === idx;
                      const isAnswered = !!answers[q._id];
                      const isMarked = markedForReview[q._id];
                      
                      let bgColor = 'bg-slate-50 text-slate-400';
                      if (isCurrent) bgColor = 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-100 ring-offset-1';
                      else if (isMarked) bgColor = 'bg-amber-100 text-amber-600 border border-amber-200';
                      else if (isAnswered) bgColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';

                      return (
                        <button 
                          key={q._id}
                          onClick={() => setCurrentIndex(idx)}
                          className={`h-9 rounded-lg flex items-center justify-center text-[11px] font-black transition-all hover:scale-105 ${bgColor}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                 <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                    {[
                      { l: 'Current', c: 'bg-blue-600' },
                      { l: 'Answered', c: 'bg-emerald-50 border border-emerald-100' },
                      { l: 'Review', c: 'bg-amber-100 border border-amber-200' },
                      { l: 'Not Visited', c: 'bg-slate-50' }
                    ].map(st => (
                      <div key={st.l} className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-sm ${st.c}`} />
                         <span className="text-[8px] font-bold text-slate-400 uppercase">{st.l}</span>
                      </div>
                    ))}
                 </div>
                 
                 <div className="bg-[#f8faff] p-4 rounded-xl border border-blue-50">
                    <p className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-2 mb-1">
                       <Shield size={10} /> Secure Browser
                    </p>
                    <p className="text-[8px] text-slate-400 font-medium leading-relaxed italic">Your session is being monitored. Please do not leave the exam window.</p>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Footer - Smooth & Tiny Controls */}
      <footer className="h-14 bg-white border-t border-slate-100 px-6 flex items-center justify-between shrink-0 relative z-[1100]">
        <button 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
          className="flex items-center gap-2 px-6 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition disabled:opacity-30"
        >
          <ChevronLeft size={14} /> BACK
        </button>

        <div className="flex gap-3">
           <button 
             onClick={() => setAnswers(prev => {
                const n = {...prev};
                delete n[currentQuestion._id];
                return n;
             })}
             className="px-6 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-red-500 transition"
           >
             Clear
           </button>
           
           <button 
             onClick={() => {
                if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
             }}
             className="flex items-center gap-2 px-8 py-2 bg-[#0a0a2e] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition shadow-lg active:scale-95"
           >
             Save & Next <ChevronRight size={14} />
           </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      ` }} />
    </div>
  );
}
