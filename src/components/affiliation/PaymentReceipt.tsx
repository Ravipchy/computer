"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Printer, Home } from "lucide-react";
import type { FeeCalculationSnapshot } from "@/utils/affiliationFeeShared";
import { apiFetch } from "@/utils/api";
import { useBrand } from "@/context/BrandContext";

export type InfraRow = { rooms: string; seats: string; area: string };

export interface ReceiptData {
  refNumber: string;
  submitDate: string;
  /** Payable rupees (numeric string) or legacy plan code */
  processFee: string;
  feeCalculation?: FeeCalculationSnapshot;
  trainingPartnerName: string;
  trainingPartnerAddress: string;
  totalName: string;
  district: string;
  state: string;
  pin: string;
  country: string;
  mobile: string;
  email: string;
  statusOfInstitution: string;
  yearOfEstablishment: string;
  chiefName: string;
  designation: string;
  educationQualification: string;
  professionalExperience: string;
  dob: string;
  paymentMode: string;
  infrastructure: Record<string, InfraRow>;
  paidAmount: string;
  transactionNo: string;
  paymentScreenshot?: string;
  postalAddressOffice: string;
  zones: string[];
}

const FEE_MAP: Record<string, { plan: string; charge: string; total: string }> = {
  "2000": { plan: "TP FOR 1 YEAR", charge: "₹2000 + 18% GST", total: "₹2,360" },
  "3000": { plan: "TP FOR 2 YEARS", charge: "₹3000 + 18% GST", total: "₹3,540" },
  "5000": { plan: "TP FOR 3 YEARS", charge: "₹5000 + 18% GST", total: "₹5,900" },
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const infraFields = ["Staff Room", "Class Room", "Computer Lab", "Reception", "Toilets", "Any Other"];

interface Props {
  data: ReceiptData;
  onBack: () => void;
}

export default function PaymentReceipt({ data, onBack }: Props) {
  const { brandName, brandLogo } = useBrand();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [authSignature, setAuthSignature] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/public/settings?key=qr_code")
      .then((r) => r.json())
      .then((d: { value: string | null }) => setQrCode(d.value ?? null))
      .catch(() => null);

    apiFetch("/api/public/settings?key=auth_signature")
      .then((r) => r.json())
      .then((d: { value: string | null }) => setAuthSignature(d.value ?? null))
      .catch(() => null);
  }, []);

  const fc = data.feeCalculation;
  const feeInfo = fc
    ? {
        plan: `Affiliation — ${fc.affiliationYear} yr (${fc.discountPercent}% discount)`,
        charge: `${inr(fc.totalAmount)} (base) × ${fc.affiliationYear} yr − ${inr(fc.discountAmount)}`,
        total: inr(fc.payableAmount),
      }
    : FEE_MAP[data.processFee] ?? {
        plan: "Affiliation fee",
        charge: data.processFee ? `₹${data.processFee}` : "—",
        total: data.processFee ? `₹${Number(data.processFee).toLocaleString("en-IN")}` : "—",
      };
  const paymentTitle =
    data.paymentMode === "gpay"
      ? "PAY OPTION - GOOGLE PAY (G-PAY)"
      : "PAY OPTION - ONLINE PAYMENT";

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .receipt-wrapper, .receipt-wrapper * { visibility: visible; }
          .receipt-wrapper { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            box-shadow: none !important; 
            border: none !important; 
          }
          body { background: white !important; }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="no-print flex gap-3 mb-6 justify-end">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
        >
          <Home className="w-4 h-4" /> Back to Form
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow"
        >
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
      </div>

      {/* Receipt Wrapped for Responsiveness */}
      <div className="max-w-4xl mx-auto px-1 sm:px-0">
        <div className="sm:hidden mb-2 text-center">
           <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider animate-pulse border border-blue-100">
             Scroll Right to View Full Receipt &rarr;
           </span>
        </div>
        <div className="receipt-wrapper overflow-x-auto bg-white border border-slate-300 shadow-lg rounded-sm scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-w-175 sm:min-w-0">
        {/* Header */}
        <div className="flex flex-col items-center justify-center gap-2 border-b border-slate-200 py-4">
          {brandLogo ? (
            <Image src={brandLogo} alt={brandName || "Institution"} width={160} height={56} unoptimized className="h-12 w-auto object-contain" />
          ) : (
            <Image src="/ygroup-logo.svg" alt={brandName || "Institution"} width={160} height={56} className="h-12 w-auto object-contain" />
          )}
          <p className="text-xs font-black uppercase tracking-widest text-slate-700">
            {brandName || "Institution"}
          </p>
        </div>

        {/* Pay Option Title */}
        <div className="text-center py-3 border-b border-slate-200">
          <p className="text-lg font-bold text-[#0a0aa1] tracking-wide">{paymentTitle}</p>
        </div>

        {/* Reference + QR Row */}
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold w-36">Reference Number</td>
              <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800">{data.refNumber}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold w-36">Submit Date</td>
              <td className="border border-slate-300 px-3 py-2">{data.submitDate}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold align-top">
                {data.paymentMode === "gpay" ? "Google Pay" : "Online Payment"}
              </td>
              <td className="border border-slate-300 px-3 py-3 text-xs text-slate-500 align-top">
                <span className="italic">For Office use only</span>
                <br />Receiving date: __________
                <br />TP Code: __________________
              </td>
              <td className="border border-slate-300 px-3 py-2 font-semibold align-top text-center" colSpan={2}>
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Authorized Signatory</div>
                {authSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={authSignature} alt="Signatory" className="w-24 h-12 object-contain mx-auto" />
                ) : (
                  <div className="w-24 h-8 border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 mx-auto">Sign Here</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Main Details */}
        <table className="w-full border-collapse text-sm mt-1">
          <tbody>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold w-48 bg-slate-50">Applied For</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>ATC (Authorized Training Center)</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Name of the Institute</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>{data.trainingPartnerName}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Address of the Institute</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>{data.trainingPartnerAddress}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Postal Address (Office)</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>{data.postalAddressOffice}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Zones Selected</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                <div className="flex flex-wrap gap-2">
                  {data.zones.length > 0 ? data.zones.map(z => (
                    <span key={z} className="px-2 py-0.5 bg-blue-50 text-[#0a0aa1] border border-blue-100 rounded text-[10px] font-bold">{z}</span>
                  )) : "—"}
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Tehsil Name</td>
              <td className="border border-slate-300 px-3 py-2">{data.totalName || "—"}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50 w-32">District</td>
              <td className="border border-slate-300 px-3 py-2">{data.district}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">State</td>
              <td className="border border-slate-300 px-3 py-2">{data.state}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Pin</td>
              <td className="border border-slate-300 px-3 py-2">{data.pin}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Mobile</td>
              <td className="border border-slate-300 px-3 py-2">{data.mobile}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Email</td>
              <td className="border border-slate-300 px-3 py-2">{data.email}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Status of the Institute</td>
              <td className="border border-slate-300 px-3 py-2">{data.statusOfInstitution}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Year of the Estd.</td>
              <td className="border border-slate-300 px-3 py-2">{data.yearOfEstablishment}</td>
            </tr>
          </tbody>
        </table>

        {/* Head of Institute */}
        <div className="px-3 py-2 mt-1 bg-slate-100 border border-slate-300">
          <p className="font-bold text-sm text-slate-800 uppercase tracking-wide">Head of the Institute Details</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50 w-48">Head of the Institute</td>
              <td className="border border-slate-300 px-3 py-2">{data.chiefName}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50 w-48">Designation/Position Held</td>
              <td className="border border-slate-300 px-3 py-2">{data.designation}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Education Qualification</td>
              <td className="border border-slate-300 px-3 py-2">{data.educationQualification}</td>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Professional Experience</td>
              <td className="border border-slate-300 px-3 py-2">{data.professionalExperience}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-3 py-2 font-semibold bg-slate-50">Date of Birth</td>
              <td className="border border-slate-300 px-3 py-2" colSpan={3}>{data.dob}</td>
            </tr>
          </tbody>
        </table>

        {/* Infrastructure */}
        <div className="px-3 py-2 mt-1 bg-slate-100 border border-slate-300">
          <p className="font-bold text-sm text-slate-800 uppercase tracking-wide">Infrastructure Facility</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Particulars</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">No. of Rooms</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Seating Capacity</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Total Area (Sq.Ft.)</th>
            </tr>
          </thead>
          <tbody>
            {infraFields.map((field) => {
              const row = data.infrastructure[field] ?? { rooms: "N/A", seats: "N/A", area: "N/A" };
              return (
                <tr key={field}>
                  <td className="border border-slate-300 px-3 py-2">{field}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.rooms}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.seats}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.area}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Declaration */}
        <div className="px-3 py-2 mt-1 bg-slate-100 border border-slate-300">
          <p className="font-bold text-sm text-slate-800 text-center uppercase tracking-wide">Declaration</p>
        </div>
        <div className="border border-slate-300 px-4 py-3 text-xs text-slate-700 leading-relaxed space-y-1.5">
          <p>I, <strong>{data.chiefName}</strong>, HEAD OF <em>{data.trainingPartnerName}</em> HAVE READ AND UNDERSTOOD THE RULES OF CONDUCT OF &quot;<strong>{brandName || "Institution"}</strong>&quot; TRAINING AND AGREE TO ABIDE BY THE SAME.</p>
          <p>I CERTIFY THAT I AM THE COMPETENT AUTHORITY, BY VIRTUE OF THE ADMINISTRATIVE AND FINANCIAL POWERS VESTED IN ME BY SELF TO FURNISH THE ABOVE INFORMATION AND TO UNDERTAKE THE ABOVE STATED COMMITMENT ON BEHALF OF MY/OUR INSTITUTION.</p>
          <p>I AM AWARE THAT, IN CASE ANY INFORMATION GIVEN BY ME TO <em>{brandName || "Institution"}</em> / CANDIDATES / ETC. IS FALSE OR MISLEADING, THE INSTITUTE WOULD BE DEBARRED FROM THE CONDUCTION OF <em>{brandName || "Institution"}</em> COURSES AND/OR DEREGISTERED FROM AFFILIATION.</p>
          <p>I HAVE READ TERMS &amp; CONDITION AND CANCELLATION &amp; REFUND POLICY INCLUDING NON REFUNDABLE AFFILIATION/FRANCHISE/RENEWAL/kIT FEE/CHARGES OF THE <em>{brandName || "Institution"}</em> UNDER ANY CIRCUMSTANCES AND, ONLY AFTER COMPLETE SATISFACTION, THIS DECLARATION IS BEING MADE, WHICH MAY BE USED FOR LEGAL PURPOSES WHENEVER REQUIRED. ANY DISPUTE WILL BE SETTLED BY THE COMMITTEE CONSTITUTED BY THE <em>{brandName || "Institution"}</em>.</p>
        </div>

        {/* Payment Details + QR */}
        <div className="mt-1 border border-slate-300 flex">
          <div className="flex-1">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-300">
              <p className="font-bold text-sm text-[#0a0aa1] uppercase tracking-wide text-center">Payment Details</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 w-40">Institute Name</td>
                  <td className="border-b border-slate-200 px-3 py-2">{data.trainingPartnerName}</td>
                </tr>
                <tr>
                  <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600">Plan</td>
                  <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-800">{feeInfo.plan}</td>
                </tr>
                <tr>
                  <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600">Franchisee Charge</td>
                  <td className="border-b border-slate-200 px-3 py-2">{feeInfo.charge}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold text-slate-600">Total Amount</td>
                  <td className="px-3 py-2 font-bold text-green-700 text-base">{feeInfo.total}</td>
                </tr>
                {data.paymentMode === "gpay" && (
                  <>
                    <tr>
                      <td className="border-t border-slate-200 px-3 py-2 font-semibold text-slate-600">Paid Amount</td>
                      <td className="border-t border-slate-200 px-3 py-2 font-bold text-slate-800">₹{data.paidAmount}</td>
                    </tr>
                    <tr>
                      <td className="border-t border-slate-200 px-3 py-2 font-semibold text-slate-600">Txn No / UTR</td>
                      <td className="border-t border-slate-200 px-3 py-2 font-bold text-slate-800">{data.transactionNo}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          {/* Payment Proof / QR */}
          <div className="w-44 border-l border-slate-300 flex items-center justify-center p-3">
            {data.paymentMode === "gpay" && data.paymentScreenshot ? (
              <Image
                src={data.paymentScreenshot}
                alt="Payment Screenshot"
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 rounded-lg border border-slate-200 object-cover"
              />
            ) : qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCode} alt="Payment QR Code" className="w-32 h-32 object-contain" />
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-xs text-slate-400 text-center p-2">
                <span>QR Code</span>
                <span className="mt-1">(Upload in Admin Panel)</span>
              </div>
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div className="mt-1 border border-slate-300">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-300">
            <p className="font-bold text-sm text-[#0a0aa1] uppercase tracking-wide text-center">Pay To: Bank Account Details</p>
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 w-40 uppercase text-xs">Recipient Name</td>
                <td className="border-b border-slate-200 px-3 py-2 font-bold text-slate-800 uppercase">{brandName || "INSTITUTION"}</td>
                <td className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-600 w-32 uppercase text-xs">A/C Number</td>
                <td className="border-b border-slate-200 px-3 py-2 font-bold text-blue-700">33217276617</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-slate-600 uppercase text-xs">IFSC Code</td>
                <td className="px-3 py-2 font-bold text-blue-700">SBIN0003918</td>
                <td className="px-3 py-2 font-semibold text-slate-600 uppercase text-xs">Branch Address</td>
                <td className="px-3 py-2 text-slate-700 text-xs">KHODARAM BAUGH BOISAR(WEST) TALUKA PALGHAR THANE</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Seal & Signature */}
        <div className="mt-1 border border-slate-300 grid grid-cols-2">
          <div className="border-r border-slate-300 px-4 py-8 text-sm text-slate-500 h-24 flex items-end">Seal of the Institute</div>
          <div className="px-4 py-8 text-sm text-slate-500 text-right h-24 relative flex flex-col items-end justify-end">
            {authSignature && (
              <Image
                src={authSignature}
                alt="Authorized Sign"
                width={128}
                height={56}
                unoptimized
                className="absolute top-2 right-4 h-14 w-32 object-contain opacity-90 mix-blend-multiply"
              />
            )}
            <span className="relative z-10 font-bold underline decoration-slate-300">Signature of Director/Head</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="mt-1 border border-slate-300 px-4 py-3">
          <p className="text-sm font-bold text-blue-700 underline mb-2">Checklist</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Printout of Completely filled online Application Form.</li>
            <li>Demand draft in favour of <strong>&quot;{brandName || "Institution"}&quot;</strong> OR Online payment receipt.</li>
            <li>Photocopy of Institute registration letter (if any), OR ID and address proof of Institution Head.</li>
          </ul>
        </div>

        {/* Bottom Buttons */}
        <div className="no-print flex items-center justify-center gap-4 py-5 border-t border-slate-200 mt-2">
          <button
            onClick={() => window.print()}
            className="px-8 py-2.5 rounded bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow"
          >
            Print
          </button>
          <button
            onClick={onBack}
            className="px-8 py-2.5 rounded bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition shadow"
          >
            Home
          </button>
        </div>
        </div>
      </div>
    </div>
    </>
  );
}
