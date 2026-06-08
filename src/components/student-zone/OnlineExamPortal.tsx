"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Play, Clock, CheckCircle, ShieldCheck, XCircle } from "lucide-react";

interface StudentData {
  _id: string;
  name: string;
  enrollmentNo: string;
  course: string;
  tpCode: string;
}

interface QuestionSet {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
}

interface ExamQuestion {
  _id: string;
  setId: string;
  questionText: string;
  options: string[];
  marks: number;
}

export default function OnlineExamPortal() {
  const [identifier, setIdentifier] = useState("");
  const [student, setStudent] = useState<StudentData | null>(null);
  const [assignment, setAssignment] = useState<{ examDate?: string; notes?: string } | null>(null);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ totalScore: number; maxScore: number } | null>(null);

  const selectedSet = useMemo(
    () => sets.find((set) => set._id === selectedSetId) ?? null,
    [sets, selectedSetId],
  );

  const filteredQuestions = useMemo(
    () => questions.filter((question) => question.setId === selectedSetId),
    [questions, selectedSetId],
  );

  useEffect(() => {
    if (!examStarted || timeLeft <= 0 || result) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [examStarted, timeLeft, result]);

  useEffect(() => {
    if (timeLeft === 0 && examStarted && !result && selectedSetId) {
      setExamStarted(false);
      void submitExam();
    }
  }, [timeLeft, examStarted, result, selectedSetId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const key = identifier.trim();
    if (!key) {
      setSearchError("Enter a student registration number or ID.");
      return;
    }

    setLoading(true);
    setSearchError(null);
    setResult(null);
    setExamStarted(false);
    setTimeLeft(0);
    try {
      const res = await fetch(`/api/student/exams?identifier=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.message || "Student exam data not found.");
        setStudent(null);
        setAssignment(null);
        setSets([]);
        setQuestions([]);
        return;
      }
      setStudent(data.student ?? null);
      setAssignment(data.assignment ?? null);
      setSets(data.sets ?? []);
      setQuestions(data.questions ?? []);
      setSelectedSetId(data.sets?.[0]?._id ?? null);
    } catch {
      setSearchError("Unable to search for exam data.");
      setStudent(null);
      setAssignment(null);
      setSets([]);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const startExam = () => {
    if (!selectedSet) return;
    setExamStarted(true);
    setTimeLeft(selectedSet.durationMinutes * 60);
    setAnswers({});
    setResult(null);
  };

  const updateAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitExam = async () => {
    if (!student || !selectedSetId) return;
    if (submitting) return;
    setSubmitting(true);

    try {
      const answerArray = filteredQuestions.map((question) => ({
        questionId: question._id,
        selectedOption: answers[question._id] ?? "",
      }));
      const res = await fetch("/api/student/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student._id, setId: selectedSetId, answers: answerArray }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.message || "Unable to submit exam.");
        return;
      }
      setResult(data.result ?? null);
      setExamStarted(false);
    } catch {
      setSearchError("Exam submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedQuestionsCount = filteredQuestions.length;

  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden bg-[#080815] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_25%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-7xl flex-col justify-between px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Online Exam Portal</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Student Exam Access</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Enter your registration number or student ID to view assigned exam sets, start your online test, and submit answers before the timer expires.</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 text-slate-300 shadow-sm">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-slate-500">Status</div>
                <div className="mt-3 flex items-center gap-2 text-3xl font-semibold text-white">
                  <Clock className="w-6 h-6 text-blue-400" />
                  Exam Ready
                </div>
              </div>
            </div>

            <form className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={handleSearch}>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter enrollment number or student ID"
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-70"
              >
                <Play className="w-4 h-4" />
                {loading ? "Searching…" : "Find Exam"}
              </button>
            </form>
            {searchError && <p className="mt-3 text-sm text-red-400">{searchError}</p>}
          </div>

          {student && assignment ? (
            <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Candidate</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{student.name}</h2>
                      <p className="mt-2 text-sm text-slate-400">Enrollment no. {student.enrollmentNo}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200">
                      <ShieldCheck className="w-4 h-4" /> {student.tpCode || "Center student"}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Exam Date</p>
                      <p className="mt-2 text-sm text-slate-100">{assignment.examDate || "Not scheduled"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assigned Sets</p>
                      <p className="mt-2 text-sm text-slate-100">{sets.length} set(s)</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Select Set</p>
                      <p className="mt-2 text-lg font-semibold text-white">{selectedSet?.title || "Pick a set to continue"}</p>
                    </div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{sets.length} sets</div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {sets.map((set) => (
                      <button
                        key={set._id}
                        type="button"
                        onClick={() => setSelectedSetId(set._id)}
                        className={`w-full rounded-3xl border px-4 py-4 text-left transition ${selectedSetId === set._id ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-900/80 hover:border-slate-500"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{set.title}</p>
                            <p className="mt-1 text-sm text-slate-400">{set.description || "No description available."}</p>
                          </div>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">{set.durationMinutes} mins</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Instructions</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Exam Flow</h3>
                    </div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">{selectedQuestionsCount} questions</div>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2"><CheckCircle className="mt-1 h-4 w-4 text-emerald-400" /> Answer every question before time runs out.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="mt-1 h-4 w-4 text-emerald-400" /> Your answers are submitted automatically when time expires.</li>
                    <li className="flex items-start gap-2"><CheckCircle className="mt-1 h-4 w-4 text-emerald-400" /> You may change your selected answer until you submit.</li>
                  </ul>
                  <button
                    type="button"
                    onClick={startExam}
                    disabled={!selectedSet || examStarted}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Play className="w-4 h-4" />
                    Start Exam
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overview</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Exam Details</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-3xl bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                      <Clock className="w-4 h-4" /> {selectedSet ? formatTime(selectedSet.durationMinutes * 60) : "00:00"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected Set</p>
                      <p className="mt-2 text-sm text-slate-100">{selectedSet?.title ?? "Not chosen"}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Exam Length</p>
                      <p className="mt-2 text-sm text-slate-100">{selectedSet?.durationMinutes ?? 0} minutes</p>
                    </div>
                  </div>
                </div>

                {examStarted ? (
                  <div className="rounded-3xl border border-blue-500/20 bg-blue-950/60 p-6 shadow-2xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Timer</p>
                        <p className="mt-2 text-3xl font-bold text-white">{formatTime(timeLeft)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={submitExam}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-white transition disabled:opacity-70"
                      >
                        {submitting ? "Submitting…" : "Submit Answers"}
                      </button>
                    </div>
                  </div>
                ) : result ? (
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/60 p-6 shadow-2xl">
                    <div className="flex items-center gap-3 text-emerald-300">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="text-xl font-semibold">Exam submitted successfully</h3>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Score</p>
                        <p className="mt-2 text-3xl font-bold text-white">{result.totalScore}/{result.maxScore}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                        <p className="mt-2 text-lg font-semibold text-white">Completed</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                    <div className="text-sm text-slate-400">Select a set and start the exam to see the timer and question panel.</div>
                  </div>
                )}

                {selectedSet && examStarted && (
                  <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 shadow-2xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">Questions</h3>
                        <p className="mt-1 text-sm text-slate-400">{selectedQuestionsCount} questions in this set.</p>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-blue-200">Live exam</span>
                    </div>
                    <div className="mt-6 space-y-5">
                      {filteredQuestions.map((question, index) => (
                        <div key={question._id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-semibold text-white">{index + 1}. {question.questionText}</p>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{question.marks} marks</span>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {question.options.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateAnswer(question._id, option)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${answers[question._id] === option ? "border-blue-400 bg-blue-500/20 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : student && !assignment ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-950/60 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center gap-3 text-red-300">
                <XCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Exam assignment not found</p>
                  <p className="mt-1 text-sm text-slate-400">Please contact your centre to get exam scheduling and set assignment details.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
