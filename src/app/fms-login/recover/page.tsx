import Link from "next/link";

export default function FmsRecoverPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2f3746] px-4">
      <section className="w-full max-w-170 overflow-hidden bg-[#f2f2f2] shadow-[0_1px_2px_rgba(0,0,0,0.25)] sm:max-w-3xl">
        <div className="bg-[#4ab7d8] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-center text-lg font-medium leading-snug text-white sm:text-2xl">
            Enter your e-mail address below and we will send you instructions how to
            recover a password.
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex max-w-145">
            <span className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-[#e8e8e8] text-slate-600 sm:h-13 sm:w-13">
              ✉
            </span>
            <input
              type="email"
              placeholder="E-mail address"
              className="h-10 flex-1 border border-l-0 border-slate-300 bg-white px-3 text-base text-slate-700 outline-none transition focus:border-[#4ab7d8] sm:h-13 sm:text-xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/fms-login"
            className="rounded-md bg-[#2f333a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#21252b]"
          >
            &laquo; Back to login
          </Link>
          <button
            type="button"
            className="rounded-md bg-[#43a9c7] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3794b0]"
          >
            Recover
          </button>
        </div>
      </section>
    </main>
  );
}
