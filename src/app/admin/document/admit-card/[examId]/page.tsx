"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AdmitCard from "@/components/student/AdmitCard";

type AdmitPayload = {
  student: Record<string, unknown>;
  exam: Record<string, unknown>;
};

export default function AdminAdmitCardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const [data, setData] = useState<AdmitPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/admit-card?examId=${encodeURIComponent(examId)}`);
        if (!res.ok) {
          router.push("/admin/panel");
          return;
        }
        const payload = (await res.json()) as AdmitPayload;
        setData(payload);
      } catch {
        router.push("/admin/panel");
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      void fetchData();
    }
  }, [examId, router]);

  useEffect(() => {
    if (!data) return;
    if (searchParams.get("print") === "1") {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [data, searchParams]);

  if (loading) {
    return <div className="p-16 text-center font-bold text-slate-500 uppercase">Loading Admit Card...</div>;
  }
  if (!data) return null;

  return (
    <AdmitCard
      student={data.student}
      exam={data.exam}
      onClose={() => router.push("/admin/panel")}
    />
  );
}

