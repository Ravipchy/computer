"use client";

import { useState } from "react";
import InternalPageLayout from "@/components/InternalPageLayout";
import { Search, Building2, MapPin, Phone, CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";

export default function AtcVerification() {
  const [registrationId, setRegistrationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/public/verify/atc?registrationId=${registrationId}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || "ATC not found");
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
      case "verified": return "text-blue-600 bg-blue-50 border-blue-200";
      case "disabled": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <InternalPageLayout 
      title="ATC Verification"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Verification" },
        { label: "ATC Verification" }
      ]}
    >
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-[#0a0aa1] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">Verify Authorized Training Center (ATC)</h2>
              <p className="text-blue-100">Enter registration ID to verify center authenticity</p>
            </div>
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
              <Building2 size={160} />
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleVerify} className="mb-10">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Registration ID / ATC Code</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Enter Registration ID or ATC Code"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0a0aa1] focus:border-transparent transition-all outline-none"
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md:mt-7">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto h-[48px] px-8 bg-[#0a0aa1] hover:bg-[#080885] text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        VERIFY
                      </>
                    )}
                  </button>
                </div>
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
                  <h3 className="text-xl font-bold text-slate-900">ATC Center Details</h3>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${getStatusColor(result.status)}`}>
                    <CheckCircle2 className="w-5 h-5" />
                    {result.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#0a0aa1] shrink-0 border border-blue-100">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Center Name</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{result.atcName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#0a0aa1] shrink-0 border border-blue-100">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">ATC Code</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{result.atcCode}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#0a0aa1] shrink-0 border border-blue-100">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Center Details / Address</p>
                        <p className="text-base font-semibold text-slate-700 leading-snug">{result.centerDetails}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#0a0aa1] shrink-0 border border-blue-100">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Info</p>
                        <p className="text-base font-semibold text-slate-700 leading-none">{result.contactInfo}</p>
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
            <p className="font-bold mb-1">Attention:</p>
            <p>Always verify the ATC code and center name before taking admission at any center. Only Authorized Training Centers are eligible to conduct exams and issue certificates.</p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
