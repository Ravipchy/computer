"use client";

import { useMemo, useState } from "react";
import InternalPageLayout from "@/components/InternalPageLayout";
import { Search, Award, User, Calendar, BookOpen, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { ISO_DATE_MIN, isoDateToday, sanitizeIsoDateInput } from "@/lib/isoDate";

export default function CertificateVerification() {
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
      const res = await fetch(`/api/public/verify/certificate?enrollment=${enrollment}&dob=${dob}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || "Certificate record not found");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InternalPageLayout 
      title="Certificate Verification"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Verification" },
        { label: "Certificate Verification" }
      ]}
    >
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-[#0a0aa1] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Verify Certificate</h2>
              <p className="text-blue-100">Enter student details to verify certificate authenticity</p>
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <Award size={160} />
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
                      <Award className="w-5 h-5" />
                      VERIFY CERTIFICATE
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
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">Certificate Credentials</h3>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${result.status === 'Valid' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {result.status === 'Valid' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    {result.status} Certificate
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#0a0aa1] shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Student Name</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{result.studentName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#0a0aa1] shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Certificate ID</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{result.certificateId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#0a0aa1] shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Course Name</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{result.courseName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[#0a0aa1] shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Issue Date</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{result.issueDate}</p>
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
            <p className="font-bold mb-1">Important:</p>
            <p>Verification of the original certificate is mandatory for recruitment and higher studies. This online portal provides preliminary verification based on digital records.</p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
