import { Lock, User } from "lucide-react";
import Link from "next/link";
import { getBrandName } from "@/lib/settings";

export default async function FmsLoginPage() {
  const brandName = await getBrandName();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2f3746] px-4">
      <section className="w-full max-w-84 overflow-hidden bg-[#f2f2f2] shadow-[0_1px_2px_rgba(0,0,0,0.2)] sm:max-w-96">
        <div className="bg-[#4ab7d8] px-5 py-4">
          <h1 className="text-center text-2xl font-bold leading-tight text-white sm:text-[2.1rem]">
            {brandName} Login
          </h1>
        </div>

        <form className="space-y-6 px-4 py-6" action="#" method="post">
          <div className="flex">
            <span className="flex h-9 w-9 items-center justify-center border border-slate-300 bg-[#e8e8e8] text-slate-700">
              <User className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              placeholder="Username"
              className="h-9 flex-1 border border-l-0 border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#4ab7d8]"
            />
          </div>

          <div className="flex">
            <span className="flex h-9 w-9 items-center justify-center border border-slate-300 bg-[#e8e8e8] text-slate-700">
              <Lock className="h-3.5 w-3.5" />
            </span>
            <input
              type="password"
              placeholder="Password"
              className="h-9 flex-1 border border-l-0 border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#4ab7d8]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/fms-login/recover"
              className="rounded-md bg-[#2e3239] px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1f2328]"
            >
              Lost password?
            </Link>
            <button
              type="submit"
              className="rounded-md bg-[#3aa64a] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#308d3e]"
            >
              Login
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
