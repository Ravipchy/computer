"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, History, CreditCard, Printer, X, Plus, Minus, FileText, CheckCircle } from "lucide-react";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import { useBrand } from "@/context/BrandContext";
import { useCallback } from "react";
import { ISO_DATE_MIN, isoDateToday, sanitizeIsoDateInput } from "@/lib/isoDate";

interface Student {
  _id: string;
  enrollmentNo: string;
  name: string;
  fatherName: string;
  mobile: string;
  email?: string;
  course: string;
  status: string;
  totalFee: number;
  paidAmount: number;
  duesAmount: number;
  admissionFees?: string;
  centerCode?: string;
  tpCode?: string;
  dob?: string;
}

interface Transaction {
  _id: string;
  date: string;
  receiptNo: string;
  paidFor: string;
  paymentMode: string;
  amount: number;
  type: "collect" | "return";
  nextInstallmentDate?: string;
  nextInstallmentAmount?: number;
}

export default function FeeManager({ role }: { role: "admin" | "atc" }) {
  const paymentDateMax = useMemo(() => isoDateToday(), []);
  const { brandName } = useBrand();
  const roleLabel = role === "admin" ? "Admin" : "ATC";
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [centers, setCenters] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showCollectForm, setShowCollectForm] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "collect",
    enrollmentNo: "",
    name: "",
    course: "",
    totalFee: 0,
    paidAmount: 0,
    duesAmount: 0,
    date: new Date().toISOString().split("T")[0],
    receiptNo: "",
    paidFor: "",
    paymentMode: "Cash",
    amount: 0,
    nextInstallmentDate: "",
    nextInstallmentAmount: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { loading: authLoading, user: authUser } = useAuth();

  const fetchStudents = useCallback(async () => {
    if (authLoading || !authUser) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("regNo", search);
      if (courseFilter) query.append("course", courseFilter);
      if (statusFilter) query.append("status", statusFilter);
      
      const res = await apiFetch(`/api/fee/students?${query.toString()}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, authUser, search, courseFilter, statusFilter]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    fetchStudents();
    apiFetch("/api/public/centers").then(r => r.json()).then(data => setCenters(data)).catch(() => {});
  }, [fetchStudents, authLoading, authUser]);

  const fetchHistory = async (student: Student) => {
    setSelectedStudent(student);
    if (!authUser) return;
    try {
      const res = await apiFetch(`/api/fee/history/${student._id}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setShowDetails(true);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleLookup = async (regNo: string) => {
    if (!regNo || !authUser) return;
    try {
      const res = await apiFetch(`/api/fee/lookup?regNo=${regNo}`);
      const data = await res.json();
      if (res.ok && data.student) {
        setFormData(prev => ({
          ...prev,
          name: data.student.name,
          course: data.student.course,
          totalFee: data.student.totalFee,
          paidAmount: data.student.paidAmount,
          duesAmount: data.student.duesAmount,
          enrollmentNo: regNo,
          paidFor: data.student.course
        }));
        // Auto-generate receipt number if empty
        if (!formData.receiptNo) {
          setFormData(prev => ({ ...prev, receiptNo: `REC-${Date.now().toString().slice(-6)}` }));
        }
      }
    } catch (err) {
      console.error("Lookup failed", err);
    }
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    const student = students.find(s => s.enrollmentNo === formData.enrollmentNo);
    if (!student) {
      setMsg({ type: "error", text: "Student not found" });
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = formData.type === "collect" ? "/api/fee/collect" : "/api/fee/return";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student._id,
          date: formData.date,
          receiptNo: formData.receiptNo,
          paidFor: formData.paidFor,
          paymentMode: formData.paymentMode,
          amount: formData.amount,
          nextInstallmentDate: formData.nextInstallmentDate,
          nextInstallmentAmount: formData.nextInstallmentAmount
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: data.message });
        fetchStudents();
        setTimeout(() => {
          setShowCollectForm(false);
          setMsg(null);
          setFormData({
            type: "collect",
            enrollmentNo: "",
            name: "",
            course: "",
            totalFee: 0,
            paidAmount: 0,
            duesAmount: 0,
            date: new Date().toISOString().split("T")[0],
            receiptNo: "",
            paidFor: "",
            paymentMode: "Cash",
            amount: 0,
            nextInstallmentDate: "",
            nextInstallmentAmount: ""
          });
        }, 1500);

        // Send Email notification if collect and next installment is set
        if (formData.type === "collect") {
          const remainingDues = Math.max(0, student.duesAmount - formData.amount);
          const msgBody = `Dear ${student.name},\r\n\r\n` +
            `This email is to confirm that we have successfully received your fee payment. Please find the details of your transaction below:\r\n\r\n` +
            `--------------------------------------------------\r\n` +
            `FEES\r\n` +
            `--------------------------------------------------\r\n` +
            `Receipt Number: ${formData.receiptNo}\r\n` +
            `Date of Payment: ${new Date(formData.date).toLocaleDateString()}\r\n` +
            `Payment Received For: ${formData.paidFor}\r\n` +
            `Amount Paid: ₹${formData.amount}\r\n` +
            `Payment Mode: ${formData.paymentMode}\r\n` +
            `Remaining Dues: ₹${remainingDues}\r\n` +
            `--------------------------------------------------\r\n\r\n`;

          let nextBody = "";
          if (formData.nextInstallmentDate && formData.nextInstallmentAmount) {
            nextBody = `* Upcoming Dues Reminder *\r\n` +
              `Please note that your next installment of ₹${formData.nextInstallmentAmount} is scheduled to be due on ${new Date(formData.nextInstallmentDate).toLocaleDateString()}. We request you to kindly clear the upcoming dues on or before the due date to avoid any inconvenience.\r\n\r\n`;
          }

          const plainMsg = msgBody + nextBody + `If you have any questions regarding this transaction, please do not hesitate to contact us.\r\n\r\n` +
            `Sincerely,\r\n` +
            `${brandName || "Administration"}\r\n`;
            
          const finalMsg = encodeURIComponent(plainMsg);
          const toEmail = student.email || "";
          const subject = encodeURIComponent(`Fee Receipt - ${formData.receiptNo}`);
          
          setTimeout(() => {
            window.open(`mailto:${toEmail}?subject=${subject}&body=${finalMsg}`, "_blank");
          }, 500);
        }
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const printReceipt = (transaction: Transaction, student: Student) => {
    const center = centers.find(c => c.tpCode === student.centerCode || c.tpCode === student.tpCode || (student as any).tpCode);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Receipt - ${transaction.receiptNo}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: sans-serif; color: #333; margin: 0; padding: 10px; font-size: 13px; max-height: 45vh; overflow: hidden; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .receipt-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; font-size: 10px; text-transform: uppercase; }
            .value { font-size: 13px; margin-top: 2px; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background: #f9f9f9; font-size: 11px; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature { border-top: 1px solid #333; width: 150px; text-align: center; padding-top: 5px; font-size: 12px; }
            .total-row { font-weight: bold; font-size: 14px; }
            .next-dues { margin-top: 15px; padding: 10px; background: #f9f9f9; border: 1px dashed #ccc; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="receipt-title">FEES RECEIPT</div>
            <div>${brandName || "Institute"}</div>
          </div>
          <div class="grid">
            <div>
              <div class="label">Receipt No</div>
              <div class="value">${transaction.receiptNo}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Date</div>
              <div class="value">${new Date(transaction.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="label">Student Name</div>
              <div class="value">${student.name}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Enrollment number</div>
              <div class="value">${student.enrollmentNo}</div>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Payment Mode</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${transaction.paidFor} (${transaction.type === 'collect' ? 'Received' : 'Returned'})</td>
                <td>${transaction.paymentMode}</td>
                <td style="text-align: right;">₹${transaction.amount}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align: right;">Total Paid</td>
                <td style="text-align: right;">₹${transaction.amount}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 15px; font-size: 12px;">
            <p><strong>Remaining Dues:</strong> ₹${student.duesAmount}</p>
          </div>
          ${transaction.nextInstallmentDate && transaction.nextInstallmentAmount ? `
            <div class="next-dues">
              <strong>Next Installment Due:</strong> ₹${transaction.nextInstallmentAmount} on ${new Date(transaction.nextInstallmentDate).toLocaleDateString()}
            </div>
          ` : ''}
          <div class="footer">
            <div>
              <p style="font-size: 10px; color: #999;">This is a computer generated receipt.</p>
            </div>
            <div style="text-align: center; width: 150px;">
              ${center?.signature ? `<img src="${center.signature}" alt="Signature" style="max-height: 40px; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;" />` : '<div style="height: 45px;"></div>'}
              <div class="signature">Authorized Signatory</div>
            </div>
          </div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-600" />
            <input 
              type="text" 
              placeholder="Search enrollment no…" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 transition w-64"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 transition"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button 
          onClick={() => setShowCollectForm(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition shadow-lg shadow-green-100"
        >
          <CreditCard className="w-4 h-4" /> Collect Fee
        </button>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4">Enrollment</th>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Financial Summary</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <SkeletonLoader type="card" count={3} />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <FileText className="w-10 h-10 text-slate-200" />
                       <p className="text-sm font-bold text-slate-400 uppercase">No Students Found</p>
                    </div>
                  </td>
                </tr>
              ) : students.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-600 border border-slate-200">
                      {s.enrollmentNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">S/o {s.fatherName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-600">{s.course}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Fee: <span className="text-slate-700">₹{s.totalFee || s.admissionFees || 0}</span></p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Paid: <span className="text-emerald-600">₹{s.paidAmount || 0}</span></p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Remaining Dues: <span className={`${((s.totalFee || Number(s.admissionFees) || 0) - (s.paidAmount || 0)) > 0 ? "text-red-600" : "text-emerald-700"}`}>₹{(s.totalFee || Number(s.admissionFees) || 0) - (s.paidAmount || 0)}</span></p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => fetchHistory(s)}
                      className="p-2 hover:bg-green-50 rounded-xl transition text-green-600"
                      title="View History"
                    >
                      <History className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Fee Modal */}
      {showCollectForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCollectForm(false)} />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-4xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between bg-linear-to-br from-green-600 to-emerald-700 p-8 text-white">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Collect Fee</h2>
                <p className="text-green-100 text-xs font-bold uppercase tracking-widest mt-1">{roleLabel} Transaction Portal</p>
              </div>
              <button onClick={() => setShowCollectForm(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectSubmit} className="p-8 space-y-6">
              {msg && (
                <div className={`p-4 rounded-2xl text-sm font-bold border ${msg.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                   {msg.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                  >
                    <option value="collect">Collect Fee</option>
                    <option value="return">Return Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Enrollment number</label>
                  <input 
                    type="text"
                    required
                    value={formData.enrollmentNo}
                    onChange={e => setFormData({...formData, enrollmentNo: e.target.value})}
                    onBlur={() => handleLookup(formData.enrollmentNo)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                    placeholder="Search enrollment no…"
                  />
                </div>

                <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Student Name</p>
                    <p className="text-xs font-black text-slate-700 truncate">{formData.name || "---"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Course</p>
                    <p className="text-xs font-black text-slate-700 truncate">{formData.course || "---"}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Paid Amount</p>
                    <p className="text-xs font-black text-emerald-600">₹{formData.paidAmount}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Current Dues</p>
                    <p className="text-xs font-black text-red-600">₹{formData.duesAmount}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Date</label>
                  <input 
                    type="date"
                    required
                    min={ISO_DATE_MIN}
                    max={paymentDateMax}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: sanitizeIsoDateInput(e.target.value) })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Receipt Number</label>
                  <input 
                    type="text"
                    required
                    value={formData.receiptNo}
                    onChange={e => setFormData({...formData, receiptNo: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Paid For</label>
                  <input 
                    type="text"
                    required
                    value={formData.paidFor}
                    onChange={e => setFormData({...formData, paidFor: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                    placeholder="e.g. Total Fee / Exam Fee"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</label>
                  <select 
                    value={formData.paymentMode}
                    onChange={e => setFormData({...formData, paymentMode: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                  >
                    <option>Cash</option>
                    <option>Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Next Install Date</label>
                  <input 
                    type="date"
                    min={ISO_DATE_MIN}
                    value={formData.nextInstallmentDate}
                    onChange={e => setFormData({ ...formData, nextInstallmentDate: sanitizeIsoDateInput(e.target.value) })}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Next Install Amt (₹)</label>
                  <input 
                    type="number"
                    min="1"
                    value={formData.nextInstallmentAmount}
                    onChange={e => setFormData({...formData, nextInstallmentAmount: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition"
                    placeholder="Optional"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount to {formData.type === 'collect' ? 'Receive' : 'Return'} (₹)</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-6 py-4 bg-green-50/50 border border-green-100 rounded-2xl text-lg font-black text-green-700 outline-none focus:bg-white focus:border-green-600 transition"
                    placeholder="Enter Amount"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={submitting}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-green-700 transition shadow-xl shadow-green-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle className="w-5 h-5" />}
                  {submitting ? "Processing..." : `Confirm ${formData.type === 'collect' ? 'Collection' : 'Return'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showDetails && selectedStudent && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-w-4xl overflow-hidden rounded-4xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center">
                   <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedStudent.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{selectedStudent.enrollmentNo} • {selectedStudent.course}</p>
                </div>
              </div>
              <button onClick={() => setShowDetails(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8">
               {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {(() => {
                    const totalPaid = transactions.reduce((acc, t) => acc + (t.type === 'collect' ? t.amount : -t.amount), 0);
                    const totalAdmission = selectedStudent.totalFee || Number(selectedStudent.admissionFees) || 0;
                    const remainingDues = totalAdmission - totalPaid;
                    
                    return (
                      <>
                        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
                           <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Total Fee</p>
                           <p className="text-2xl font-black text-blue-800">₹{totalAdmission}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                           <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total Paid</p>
                           <p className="text-2xl font-black text-emerald-800">₹{totalPaid}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-red-50 border border-red-100">
                           <p className="text-[10px] font-black text-red-600 uppercase mb-1">Remaining Dues</p>
                           <p className="text-2xl font-black text-red-800">₹{remainingDues}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Payment History</h4>
               <div className="max-h-100 overflow-y-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                           <th className="px-6 py-3">Date</th>
                           <th className="px-6 py-3">Receipt No</th>
                           <th className="px-6 py-3">Paid For</th>
                           <th className="px-6 py-3">Mode</th>
                           <th className="px-6 py-3">Type</th>
                           <th className="px-6 py-3">Amount</th>
                           <th className="px-6 py-3 text-right">Receipt</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {transactions.length === 0 ? (
                           <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-[10px]">No transactions recorded</td>
                           </tr>
                        ) : transactions.map((t) => (
                           <tr key={t._id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 font-black text-slate-700">{t.receiptNo}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.paidFor}</td>
                              <td className="px-6 py-4">
                                 <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black uppercase text-slate-600">{t.paymentMode}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase ${t.type === 'collect' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {t.type === 'collect' ? <Plus className="w-2 h-2" /> : <Minus className="w-2 h-2" />}
                                    {t.type}
                                 </span>
                              </td>
                              <td className={`px-6 py-4 font-black ${t.type === 'collect' ? 'text-slate-800' : 'text-red-600'}`}>₹{t.amount}</td>
                              <td className="px-6 py-4 text-right">
                                 <button 
                                    onClick={() => printReceipt(t, selectedStudent)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-green-600"
                                 >
                                    <Printer className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
