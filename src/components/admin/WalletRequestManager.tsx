"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import SkeletonLoader from "@/components/common/SkeletonLoader";

type WalletRequest = {
  _id: string;
  tpCode: string;
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
  atcId?: { trainingPartnerName?: string; walletBalance?: number };
};

export default function WalletRequestManager() {
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<"approve" | "reject" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [viewingRequest, setViewingRequest] = useState<WalletRequest | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [processModal, setProcessModal] = useState<{ request: WalletRequest; action: "approve" | "reject" } | null>(null);
  const [processAmount, setProcessAmount] = useState("");
  const [processRemark, setProcessRemark] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/wallet-requests");
      const data = await res.json();
      if (res.ok) {
        const nextRequests: WalletRequest[] = Array.isArray(data.requests) ? data.requests : [];
        setRequests(nextRequests);
        setSelectedRequestIds((prev) =>
          prev.filter((id) => nextRequests.some((request) => request._id === id && request.status === "pending"))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleAction = async (
    requestId: string,
    action: "approve" | "reject",
    options?: { approvedAmount?: number; adminRemark?: string }
  ) => {
    setActionId(requestId + action);
    try {
      const res = await apiFetch("/api/admin/wallet-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, ...options }),
      });
      if (res.ok) await loadRequests();
    } finally {
      setActionId(null);
    }
  };

  const openProcessModal = (request: WalletRequest, action: "approve" | "reject") => {
    setProcessModal({ request, action });
    setProcessAmount(String(request.amount || ""));
    setProcessRemark("");
  };

  const submitProcessAction = async () => {
    if (!processModal) return;
    const approvedAmount = Number(processAmount);
    if (processModal.action === "approve" && (!approvedAmount || approvedAmount <= 0)) return;
    await handleAction(processModal.request._id, processModal.action, {
      approvedAmount: processModal.action === "approve" ? approvedAmount : undefined,
      adminRemark: processRemark.trim(),
    });
    setProcessModal(null);
    setProcessAmount("");
    setProcessRemark("");
  };

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const visibleRequests = requests.filter((request) => statusFilter === "all" || request.status === statusFilter);
  const allPendingSelected = pendingRequests.length > 0 && pendingRequests.every((request) => selectedRequestIds.includes(request._id));

  const toggleSelect = (requestId: string, checked: boolean) => {
    setSelectedRequestIds((prev) => {
      if (checked) return Array.from(new Set([...prev, requestId]));
      return prev.filter((id) => id !== requestId);
    });
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedRequestIds.length === 0) return;
    setBulkActionLoading(action);
    try {
      for (const requestId of selectedRequestIds) {
        await apiFetch("/api/admin/wallet-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action }),
        });
      }
      await loadRequests();
      setSelectedRequestIds([]);
    } finally {
      setBulkActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Wallet Requests</h3>
      </div>
      {selectedRequestIds.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
            {selectedRequestIds.length} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleBulkAction("approve")}
              disabled={bulkActionLoading !== null}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase disabled:opacity-60"
            >
              {bulkActionLoading === "approve" ? "Approving..." : "Approve Selected"}
            </button>
            <button
              onClick={() => void handleBulkAction("reject")}
              disabled={bulkActionLoading !== null}
              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase disabled:opacity-60"
            >
              {bulkActionLoading === "reject" ? "Rejecting..." : "Reject Selected"}
            </button>
          </div>
        </div>
      )}
      <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${
              statusFilter === status
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="p-6"><SkeletonLoader type="card" count={3} /></div>
      ) : visibleRequests.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">No wallet requests found.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {(statusFilter === "all" || statusFilter === "pending") && (
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={(e) => {
                  if (e.target.checked) setSelectedRequestIds(pendingRequests.map((request) => request._id));
                  else setSelectedRequestIds([]);
                }}
                className="h-4 w-4"
              />
              <p className="text-xs font-bold text-slate-600">
                Select all pending requests ({pendingRequests.length})
              </p>
            </div>
          )}
          {visibleRequests.map((request) => (
            <div key={request._id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  disabled={request.status !== "pending"}
                  checked={selectedRequestIds.includes(request._id)}
                  onChange={(e) => toggleSelect(request._id, e.target.checked)}
                  className="h-4 w-4 mt-1 disabled:opacity-40"
                />
                <div>
                <p className="text-sm font-bold text-slate-800">{request.atcId?.trainingPartnerName || request.tpCode}</p>
                <p className="text-xs text-slate-500">TP: {request.tpCode} | Amount: ₹{request.amount}</p>
                {request.paymentNote ? <p className="text-xs text-slate-500">Note: {request.paymentNote}</p> : null}
                <button
                  onClick={() => setViewingRequest(request)}
                  className="mt-2 px-3 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase"
                >
                  View Detail
                </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${request.status === "approved" ? "bg-emerald-100 text-emerald-700" : request.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {request.status}
                </span>
                {request.status === "pending" && (
                  <>
                    <button
                      onClick={() => openProcessModal(request, "approve")}
                      disabled={actionId === request._id + "approve"}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openProcessModal(request, "reject")}
                      disabled={actionId === request._id + "reject"}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {viewingRequest && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Wallet Request Details</h4>
              <button onClick={() => setViewingRequest(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">
                Close
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">ATC</p>
                  <p className="text-sm font-bold text-slate-800">{viewingRequest.atcId?.trainingPartnerName || viewingRequest.tpCode}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">TP Code</p>
                  <p className="text-sm font-bold text-slate-800">{viewingRequest.tpCode}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Amount</p>
                  <p className="text-sm font-bold text-slate-800">₹{viewingRequest.amount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Transaction ID / UTR</p>
                  <p className="text-sm font-bold text-slate-800">{viewingRequest.transactionId || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Payment Date</p>
                  <p className="text-sm font-bold text-slate-800">
                    {viewingRequest.paymentDate ? new Date(viewingRequest.paymentDate).toLocaleDateString("en-IN") : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Note (optional)</p>
                  <p className="text-sm font-semibold text-slate-700">{viewingRequest.paymentNote || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Approved Amount</p>
                  <p className="text-sm font-bold text-slate-800">₹{viewingRequest.approvedAmount ?? viewingRequest.amount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Admin Remark</p>
                  <p className="text-sm font-semibold text-slate-700">{viewingRequest.adminRemark || "-"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-[10px] text-blue-700 font-black uppercase">Admin Payment Details</p>
                  <p className="text-sm font-semibold text-slate-700">Note: Course Wallet Payment</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Upload payment screenshot</p>
                  {viewingRequest.paymentScreenshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingRequest.paymentScreenshot}
                      alt="Wallet payment proof"
                      onClick={() => setZoomImage(viewingRequest.paymentScreenshot)}
                      className="w-full h-[170px] object-contain rounded-lg bg-white border border-slate-200 cursor-zoom-in"
                    />
                  ) : (
                    <div className="h-[170px] flex items-center justify-center text-xs font-semibold text-slate-400 border border-dashed border-slate-300 rounded-lg bg-white">
                      No screenshot uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${viewingRequest.status === "approved" ? "bg-emerald-100 text-emerald-700" : viewingRequest.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {viewingRequest.status}
              </span>
              {viewingRequest.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      openProcessModal(viewingRequest, "reject");
                    }}
                    className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase hover:bg-red-200"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      openProcessModal(viewingRequest, "approve");
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomImage}
            alt="Zoomed payment screenshot"
            className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {processModal && (
        <div className="fixed inset-0 z-[140] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {processModal.action === "approve" ? "Approve Wallet Request" : "Reject Wallet Request"}
              </h4>
              <button className="text-xs font-bold text-slate-500" onClick={() => setProcessModal(null)}>
                Close
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              Requested Amount: <span className="font-black">₹{processModal.request.amount}</span>
            </div>
            {processModal.action === "approve" && (
              <input
                type="number"
                value={processAmount}
                onChange={(e) => setProcessAmount(e.target.value)}
                placeholder="Approved amount"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            )}
            <textarea
              value={processRemark}
              onChange={(e) => setProcessRemark(e.target.value)}
              placeholder="Admin remark (optional)"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 min-h-[90px]"
            />
            <button
              onClick={() => void submitProcessAction()}
              disabled={actionId === processModal.request._id + processModal.action}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-black uppercase ${
                processModal.action === "approve" ? "bg-emerald-600 text-white" : "bg-red-100 text-red-700"
              }`}
            >
              {processModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
