"use client";

import { useMemo, useState } from "react";
import InternalPageLayout from "@/components/InternalPageLayout";
import { Search, User, Calendar, BookOpen, Building2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { ISO_DATE_MIN, isoDateToday, sanitizeIsoDateInput } from "@/lib/isoDate";

export default function StudentVerification() {
  const dobMax = useMemo(() => isoDateToday(), []);
  const [enrollment, setEnrollment] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/public/verify/student?enrollment=${enrollment}&dob=${dob}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || "Student not found");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "text-green-600 bg-green-50 border-green-200";
      case "pending for approval": return "text-blue-600 bg-blue-50 border-blue-200";
      case "course completed": return "text-purple-600 bg-purple-50 border-purple-200";
      case "rejected": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return <CheckCircle2 className="w-5 h-5" />;
      case "pending for approval": return <Clock className="w-5 h-5" />;
      case "course completed": return <CheckCircle2 className="w-5 h-5" />;
      case "rejected": return <XCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <InternalPageLayout 
      title="Student Verification"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Verification" },
        { label: "Student Verification" }
      ]}
    >
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-[#0a0aa1] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Verify Student</h2>
              <p className="text-blue-100">Enter enrollment details to verify student record</p>
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <User size={160} />
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleVerify} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Enrollment Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter Enrollment Number"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0a0aa1] focus:border-transparent transition-all outline-none"
                    value={enrollment}
                    onChange={(e) => setEnrollment(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    min={ISO_DATE_MIN}
                    max={dobMax}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0a0aa1] focus:border-transparent transition-all outline-none"
                    value={dob}
                    onChange={(e) => setDob(sanitizeIsoDateInput(e.target.value))}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0a0aa1] hover:bg-[#080885] text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      VERIFY NOW
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 animate-in fade-in slide-in-from-top-2">
                <XCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">Verification Result</h3>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${getStatusColor(result.status)}`}>
                    {getStatusIcon(result.status)}
                    {result.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</p>
                        <p className="text-base font-semibold text-slate-900">{result.studentName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrollment Number</p>
                        <p className="text-base font-semibold text-slate-900">{result.enrollmentNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admission Date</p>
                        <p className="text-base font-semibold text-slate-900">{result.admissionDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ATC Code & Name</p>
                        <p className="text-base font-semibold text-slate-900">{result.atcCode} - {result.atcName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</p>
                        <p className="text-base font-semibold text-slate-900">{result.courseName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Important Note:</p>
            <p>Verification results are based on the data provided by the Authorized Training Centers. If you find any discrepancy, please contact your study center or the head office.</p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
