import Link from "next/link";

export default function FranchiseLoginForm() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="max-w-5xl">
        <h2 className="text-4xl font-bold text-slate-800 sm:text-5xl">ATC Login</h2>

        <form className="mt-4 space-y-3" action="#" method="post">
          <input
            type="text"
            placeholder="TP CODE"
            className="w-full border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              Login
            </button>
            <Link
              href="/"
              className="rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
