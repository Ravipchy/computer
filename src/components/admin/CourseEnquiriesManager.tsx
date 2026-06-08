"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { apiFetch } from "@/utils/api";
import SkeletonLoader from "@/components/common/SkeletonLoader";

interface CourseEnquiry {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  courseName: string;
  createdAt: string;
}

export default function CourseEnquiriesManager() {
  const [enquiries, setEnquiries] = useState<CourseEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = async () => {
    try {
      const res = await apiFetch("/api/admin/course-enquiries");
      if (res.ok) {
        const data = await res.json();
        setEnquiries(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEnquiries();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-blue-600" />
          Course Enquiries
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <SkeletonLoader type="card" count={3} />
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq._id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-700">{enq.name}</td>
                    <td className="px-6 py-4 text-slate-500">{enq.mobile}</td>
                    <td className="px-6 py-4 text-slate-500">{enq.email || "N/A"}</td>
                    <td className="px-6 py-4 text-slate-700">{enq.courseName}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(enq.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
