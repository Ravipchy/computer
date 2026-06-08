import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type InternalPageLayoutProps = {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
};

export default function InternalPageLayout({
  title,
  breadcrumbs = [],
  children,
}: InternalPageLayoutProps) {
  return (
    <>
      <Navbar />

      <main className="bg-white">
        <section className="relative overflow-hidden px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <Image
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80"
            alt="Computer lab"
            fill
            priority
            className="object-cover grayscale"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/58" />

          <div className="relative mx-auto flex w-full max-w-6xl items-center justify-center text-center">
            <h1 className="flex items-center gap-4 text-2xl font-extrabold uppercase tracking-wide sm:text-3xl lg:text-4xl">
              <span className="h-1 w-8 bg-white/90 sm:w-10" />
              {title}
              <span className="h-1 w-8 bg-white/90 sm:w-10" />
            </h1>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2.5 text-xs text-slate-500 sm:text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-3">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="font-semibold text-[#0a0aa1] transition hover:text-[#080885]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span className="text-slate-300">&gt;</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8">{children}</section>
      </main>

      <Footer />
    </>
  );
}