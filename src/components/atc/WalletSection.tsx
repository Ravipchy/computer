"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";
import { ISO_DATE_MIN, isValidIsoDate, isoDateToday, normalizeIsoDate } from "@/lib/isoDate";
import SkeletonLoader from "@/components/common/SkeletonLoader";

type WalletRequest = {
  _id: string;
  amount: number;
  transactionId: string;
  paymentDate?: string;
  paymentScreenshot: string;
  paymentNote?: string;
  approvedAmount?: number;
  adminRemark?: string;
  processedAt?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type WalletHistoryItem = {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  adminRemark?: string;
  requestedAmount?: number;
  studentName?: string;
  enrollmentNo?: string;
  courseName?: string;
  createdAt: string;
};

export default function WalletSection() {
  const [activeTab, setActiveTab] = useState<"wallet" | "history">("wallet");
  const [showAddForm, setShowAddForm] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState("");
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [history, setHistory] = useState<WalletHistoryItem[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<{ name: string; upi: string; note: string; qr: string }>({
    name: "",
    upi: "",
    note: "",
    qr: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const paymentDateMax = useMemo(() => isoDateToday(), []);

  const loadWallet = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiFetch("/api/atc/wallet");
      const data = await res.json();
      if (res.ok) {
        setBalance(Number(data.balance || 0));
        setRequests(Array.isArray(data.requests) ? data.requests : []);
        setHistory(Array.isArray(data.history) ? data.history : []);
        setPaymentConfig(data.paymentConfig || { name: "", upi: "", note: "", qr: "" });
      } else {
        setLoadError(data.message || "Failed to load wallet details.");
      }
    } catch {
      setLoadError("Unable to load wallet details. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, []);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const submitRequest = async () => {
    setMsg(null);
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setMsg({ type: "error", text: "Please enter a valid amount." });
      return;
    }
    if (!transactionId.trim()) {
      setMsg({ type: "error", text: "Transaction ID is required." });
      return;
    }
    if (!paymentScreenshot) {
      setMsg({ type: "error", text: "Payment screenshot is required." });
      return;
    }
    if (paymentDate.trim()) {
      const pd = normalizeIsoDate(paymentDate);
      if (!isValidIsoDate(pd)) {
        setMsg({
          type: "error",
          text: "Payment date must be valid (YYYY-MM-DD, year 4 digits only).",
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/atc/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          transactionId: transactionId.trim(),
          paymentDate: paymentDate.trim() ? normalizeIsoDate(paymentDate) : undefined,
          paymentScreenshot,
          paymentNote: paymentNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: data.message || "Request failed." });
      } else {
        setMsg({ type: "success", text: "Wallet request submitted" });
        setAmount("");
        setTransactionId("");
        setPaymentDate("");
        setPaymentNote("");
        setPaymentScreenshot("");
        setShowAddForm(false);
        await loadWallet();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const passbookEntries = [
    ...history.map((item) => ({
      id: `tx-${item._id}`,
      date: item.createdAt,
      kind: "transaction" as const,
      title: item.type === "credit" ? "Wallet Credit" : "Wallet Debit",
      subtitle: item.studentName || "General Wallet Entry",
      courseName: item.courseName || "",
      enrollmentNo: item.enrollmentNo || "",
      reason: item.reason,
      remark: item.adminRemark || "",
      requestedAmount: item.requestedAmount,
      amount: item.amount,
      direction: item.type,
    })),
    ...requests
      .filter((request) => request.status !== "approved")
      .map((request) => ({
      id: `req-${request._id}`,
      date: request.processedAt || request.createdAt,
      kind: "request" as const,
      title:
        request.status === "approved"
          ? "Wallet Request Approved"
          : request.status === "rejected"
            ? "Wallet Request Rejected"
            : "Wallet Request Pending",
      subtitle: request.transactionId ? `UTR: ${request.transactionId}` : "Wallet request submitted",
      courseName: "",
      enrollmentNo: "",
      reason: request.paymentNote || "Wallet top-up request",
      remark: request.adminRemark || "",
      requestedAmount: request.amount,
      amount: request.status === "approved" ? Number(request.approvedAmount ?? request.amount) : request.amount,
      direction: request.status === "approved" ? ("credit" as const) : ("debit" as const),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
              activeTab === "wallet" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
              activeTab === "history" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Wallet History
          </button>
        </div>
        <span className="text-lg font-black text-emerald-600">₹{balance}</span>
      </div>

      {activeTab === "wallet" && (
        <>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Wallet Actions</p>
              <p className="text-sm font-semibold text-slate-700">Submit payment proof and raise add money request.</p>
            </div>
            <button
              onClick={() => {
                setMsg(null);
                setShowAddForm(true);
              }}
              className="rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-bold hover:bg-green-700"
            >
              Add Wallet Payment
            </button>
          </div>

          {showAddForm && (
            <div className="rounded-2xl border border-green-100 bg-white p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Wallet Payment</p>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  placeholder="Transaction ID / UTR"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Payment date (optional)
                  </label>
                  <input
                    type="date"
                    min={ISO_DATE_MIN}
                    max={paymentDateMax}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(normalizeIsoDate(e.target.value))}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Note (optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-green-500"
              />
              {(paymentConfig.name || paymentConfig.upi || paymentConfig.note || paymentConfig.qr) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700 space-y-1">
                  <p className="font-black text-blue-700 uppercase">Admin Payment Details</p>
                  {paymentConfig.name ? <p><span className="font-semibold">Name:</span> {paymentConfig.name}</p> : null}
                  {paymentConfig.upi ? <p><span className="font-semibold">UPI:</span> {paymentConfig.upi}</p> : null}
                  {paymentConfig.note ? <p><span className="font-semibold">Note:</span> {paymentConfig.note}</p> : null}
                  {paymentConfig.qr ? (
                    <div className="pt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={paymentConfig.qr}
                        alt="Wallet Payment QR"
                        onClick={() => setZoomImage(paymentConfig.qr)}
                        className="h-36 w-36 rounded-lg border border-blue-200 bg-white object-contain cursor-zoom-in"
                      />
                      <p className="mt-1 text-[10px] font-semibold text-blue-600">Click to zoom</p>
                    </div>
                  ) : null}
                </div>
              )}
              <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 cursor-pointer hover:bg-slate-100 transition">
                Upload payment screenshot
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const base64 = await toBase64(file);
                    setPaymentScreenshot(base64);
                  }}
                />
                {paymentScreenshot ? <span className="ml-2 font-bold text-emerald-600">Uploaded</span> : null}
              </label>
              <button
                disabled={submitting}
                onClick={() => void submitRequest()}
                className="w-full rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-bold hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Submit Request"}
              </button>
            </div>
          )}

          {msg && (
            <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {msg.text}
            </div>
          )}

          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Recent Requests</p>
            {loading ? (
              <SkeletonLoader type="card" count={2} />
            ) : requests.length === 0 ? (
              <p className="text-sm text-slate-400">No wallet requests yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 6).map((request) => (
                  <div key={request._id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2 text-xs">
                    <span className="font-bold text-slate-700">₹{request.amount}</span>
                    <span className={`font-black uppercase ${request.status === "approved" ? "text-emerald-600" : request.status === "rejected" ? "text-red-600" : "text-amber-600"}`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 mb-3">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Wallet Passbook</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">All wallet transactions + request updates in one clean timeline.</p>
          </div>
          {loadError ? (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {loadError}
            </div>
          ) : null}
          {loading ? (
            <SkeletonLoader type="card" count={3} />
          ) : passbookEntries.length === 0 ? (
            <p className="text-sm text-slate-400">No wallet transactions yet.</p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {passbookEntries.slice(0, 150).map((item) => (
                <div key={item.id} className="border border-slate-100 rounded-xl px-3 py-3 text-xs bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-black text-slate-700 uppercase tracking-wide">
                        {item.title}
                      </p>
                      <p className="text-slate-600 font-semibold">
                        {item.subtitle}
                        {item.courseName ? ` - ${item.courseName}` : ""}
                      </p>
                      {item.enrollmentNo ? (
                        <p className="text-slate-500">
                          Enrollment: <span className="font-bold text-slate-700">{item.enrollmentNo}</span>
                        </p>
                      ) : null}
                      <p className="text-slate-500">{item.reason}</p>
                      {item.remark ? (
                        <p className="text-blue-700 font-semibold">Remark: {item.remark}</p>
                      ) : null}
                      {typeof item.requestedAmount === "number" ? (
                        <p className="text-slate-500">Requested: <span className="font-bold text-slate-700">₹{item.requestedAmount}</span></p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${item.direction === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                        {item.direction === "credit" ? "+" : "-"}₹{item.amount}
                      </p>
                      <p className="text-slate-500 font-semibold">
                        {new Date(item.date).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[140] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-slate-800 uppercase tracking-wider">Admin QR Screenshot</p>
              <button
                onClick={() => setZoomImage(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage}
              alt="Zoomed admin QR"
              className="w-full max-h-[75vh] rounded-xl bg-white object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
