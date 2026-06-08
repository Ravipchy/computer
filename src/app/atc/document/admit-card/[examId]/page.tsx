"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdmitCard from "@/components/student/AdmitCard";

export default function ATCAdmitCardPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [data, setData] = useState<{ student: any; exam: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/atc/exams/${examId}`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        } else {
          router.push("/atc/dashboard");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchData();
  }, [examId]);

  if (loading) return <div className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest">Loading Admit Card...</div>;
  if (!data) return null;

  return (
    <AdmitCard 
      student={data.student} 
      exam={data.exam} 
      onClose={() => router.back()} 
    />
  );
}
