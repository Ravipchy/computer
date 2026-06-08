"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InternalPageLayout from "@/components/InternalPageLayout";
import { useBrand } from "@/context/BrandContext";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { Building2 } from "lucide-react";

export default function AtcLoginPage() {
  const router = useRouter();
  const { brandName, brandLogo } = useBrand();
  const [isHydrated, setIsHydrated] = useState(false);
  const [form, setForm] = useState({ tpCode: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/atc/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tpCode: form.tpCode.trim().toUpperCase(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      
      if (data.token && data.user) {
        login(data.token, data.user);
        router.push("/atc/dashboard");
      } else {
        setError("Invalid response from server.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InternalPageLayout
      title="ATC Login"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Affiliation Process" },
        { label: "ATC Login" },
      ]}
    >
      <div className="mx-auto w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-2xl bg-slate-50 border border-slate-100 mb-4 shadow-sm overflow-hidden mx-auto">
              {isHydrated && brandLogo ? (
                 <Image src={brandLogo} alt={brandName} fill className="object-contain scale-125" />
              ) : (
                 <Building2 className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">{brandName}</h2>
            <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">ATC Access Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="TP CODE"
              value={form.tpCode}
              onChange={(e) => setForm({ ...form, tpCode: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0a0aa1]"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0a0aa1]"
            />

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-[#0a0aa1] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#080885] disabled:opacity-50 shadow-lg shadow-blue-900/10"
              >
                {loading ? "Logging in..." : "Login to Panel"}
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center rounded-xl border-2 border-slate-100 bg-white px-8 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Back to Home
              </Link>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Tip: Default password is your registered mobile number.
              </p>
            </div>
          </form>
        </div>
      </div>
    </InternalPageLayout>
  );
}
