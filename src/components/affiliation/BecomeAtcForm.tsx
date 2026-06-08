"use client";

import { Fragment, type FormEvent, useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2, User, Layers, CreditCard, ChevronDown,
  Send, RotateCcw, CheckCircle, MapPin, Phone, Mail,
  BookOpen, Briefcase, Calendar, Camera, Home, QrCode, X, FileText
} from "lucide-react";
import PaymentReceipt, { type ReceiptData, type InfraRow } from "./PaymentReceipt";
import AffiliationZoneFeeBlock from "./AffiliationZoneFeeBlock";
import {
  DISTRICTS_BY_STATE,
  getYearOptions,
} from "@/utils/atcSettings";
import type { FeeCalculationSnapshot, ZoneFeeRow } from "@/utils/affiliationFeeShared";
import { apiFetch } from "@/utils/api";
import { useBrand } from "@/context/BrandContext";
import { ISO_DATE_MIN, isValidIsoDate, normalizeIsoDate } from "@/lib/isoDate";

type FormState = {
  affiliationYear: string; trainingPartnerName: string; trainingPartnerAddress: string;
  postalAddressOffice: string; zones: string[];
  totalName: string; district: string; state: string; pin: string; country: string;
  mobile: string; email: string; statusOfInstitution: string; yearOfEstablishment: string;
  chiefName: string; designation: string; educationQualification: string;
  professionalExperience: string; dob: string; aadharNo: string; paymentMode: string;
  paidAmount: string; transactionNo: string;
};

const initialFormState: FormState = {
  affiliationYear: "", trainingPartnerName: "", trainingPartnerAddress: "", postalAddressOffice: "", zones: [],
  totalName: "", district: "", state: "", pin: "", country: "INDIA", mobile: "", email: "",
  statusOfInstitution: "", yearOfEstablishment: "", chiefName: "", designation: "",
  educationQualification: "", professionalExperience: "", dob: "", aadharNo: "", paymentMode: "",
  paidAmount: "", transactionNo: "",
};

const infraFields = ["Staff Room", "Class Room", "Computer Lab", "Reception", "Toilets", "Any Other"] as const;
const emptyInfra: Record<(typeof infraFields)[number], InfraRow> = {
  "Staff Room": { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Class Room": { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Computer Lab": { rooms: "N/A", seats: "N/A", area: "N/A" },
  Reception: { rooms: "N/A", seats: "N/A", area: "N/A" },
  Toilets: { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Any Other": { rooms: "N/A", seats: "N/A", area: "N/A" },
};

const INDIAN_STATES = Object.keys(DISTRICTS_BY_STATE);

// ── Reusable styled components ─────────────────────────────────────────────
const inputCls = [
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800",
  "placeholder-slate-400 outline-none transition",
  "focus:border-[#0a0aa1] focus:ring-2 focus:ring-[#0a0aa1]/10",
  "hover:border-slate-300",
].join(" ");

const selectCls = inputCls + " appearance-none cursor-pointer";

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
    {children}
  </label>
);

const SectionCard = ({
  icon: Icon, title, subtitle, children, color = "#0a0aa1",
}: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode; color?: string }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-100"
      style={{ background: `linear-gradient(135deg, ${color}08 0%, ${color}04 100%)` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-4 sm:px-5 py-5">{children}</div>
  </div>
);

const SelectWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
);

export default function BecomeAtcForm() {
  const { brandName } = useBrand();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [photo, setPhoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [aadharDoc, setAadharDoc] = useState<File | null>(null);
  const [marksheetDoc, setMarksheetDoc] = useState<File | null>(null);
  const [otherDocs, setOtherDocs] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [instituteDocument, setInstituteDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastRefNumber, setLastRefNumber] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculationSnapshot | null>(null);
  const [infra, setInfra] = useState<Record<(typeof infraFields)[number], InfraRow>>(emptyInfra);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  const onFeeCalculationUpdate = useCallback((c: FeeCalculationSnapshot | null) => {
    setFeeCalculation(c);
  }, []);

  const [zoneCatalog, setZoneCatalog] = useState<ZoneFeeRow[]>([]);
  const [zoneCatalogLoading, setZoneCatalogLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/public/settings?key=qr_code")
      .then(res => res.json())
      .then(data => setQrCode(data.value))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setZoneCatalogLoading(true);
    apiFetch("/year-plans")
      .then((r) => r.json())
      .then((d: { zones?: ZoneFeeRow[] }) => {
        if (cancelled) return;
        const rows = Array.isArray(d.zones)
          ? d.zones
              .filter((z): z is ZoneFeeRow => z != null && typeof z.name === "string" && typeof z.amount === "number")
              .map((z) => ({ name: z.name.trim(), amount: Math.round(z.amount) }))
          : [];
        setZoneCatalog(rows);
      })
      .catch(() => {
        if (!cancelled) setZoneCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setZoneCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const districtOptions = DISTRICTS_BY_STATE[form.state] ?? [];
  const dobMax = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const setStateField = (value: string) => {
    setForm((current) => ({
      ...current,
      state: value,
      district: DISTRICTS_BY_STATE[value]?.includes(current.district) ? current.district : "",
    }));
  };

  const errors = useMemo(() => {
    const r: string[] = [];
    if (!form.trainingPartnerName.trim()) r.push("Training partner name is required.");
    if (!form.trainingPartnerAddress.trim()) r.push("Training partner address is required.");
    if (!form.postalAddressOffice.trim()) r.push("Postal address is required.");
    if (!form.totalName.trim()) r.push("Tehsil / Taluka name is required.");
    if (form.zones.length === 0) r.push("Please select at least one zone.");
    if (form.zones.length > 0 && !form.affiliationYear.trim()) r.push("Please select affiliation period (years).");
    if (form.zones.length > 0 && form.affiliationYear.trim() && !feeCalculation) {
      r.push("Fee could not be calculated. Try re-selecting the affiliation period.");
    }
    if (!form.district.trim()) r.push("District is required.");
    if (!form.state) r.push("State is required.");
    if (!/^\d{6}$/.test(form.pin)) r.push("PIN must be 6 digits.");
    if (!/^\d{10}$/.test(form.mobile)) r.push("Mobile must be 10 digits.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) r.push("Valid email is required.");
    if (!form.statusOfInstitution) r.push("Status of institution is required.");
    if (!form.yearOfEstablishment) r.push("Year of establishment is required.");
    if (!form.chiefName.trim()) r.push("Chief executive name is required.");
    if (!form.designation.trim()) r.push("Designation is required.");
    if (!form.educationQualification.trim()) r.push("Education qualification is required.");
    if (!form.professionalExperience.trim()) r.push("Professional experience is required.");
    if (!form.dob.trim()) r.push("Date of birth is required.");
    else if (!isValidIsoDate(normalizeIsoDate(form.dob))) {
      r.push("Date of birth must be a valid date (year exactly 4 digits, YYYY-MM-DD).");
    }
    if (!/^\d{12}$/.test(form.aadharNo)) r.push("Aadhar number must be exactly 12 digits.");
    if (!photo) r.push("Passport size photo is required.");
    if (!signature) r.push("Signature is required.");
    if (!aadharDoc) r.push("Aadhar card PDF is required.");
    if (!form.paymentMode) r.push("Please select payment mode.");
    if (form.paymentMode === "gpay") {
      if (!screenshot) r.push("Please upload a payment screenshot for verification.");
      if (!form.paidAmount.trim()) r.push("Please enter the paid amount.");
      if (!form.transactionNo.trim()) r.push("Please enter the transaction / UTR number.");
    }
    if (photo && photo.size > 100 * 1024) r.push("Passport photo must be under 100 KB.");
    if (signature && signature.size > 100 * 1024) r.push("Signature image must be under 100 KB.");
    if (logo && logo.size > 100 * 1024) r.push("Logo image must be under 100 KB.");
    if (screenshot && screenshot.type.startsWith("image/") && screenshot.size > 100 * 1024) r.push("Payment screenshot image must be under 100 KB.");
    
    if (aadharDoc && aadharDoc.size > 500 * 1024) r.push("Aadhar card document must be under 500 KB.");
    if (marksheetDoc && marksheetDoc.size > 500 * 1024) r.push("Marksheet document must be under 500 KB.");
    if (otherDocs && otherDocs.size > 500 * 1024) r.push("Other documents must be under 500 KB.");
    if (instituteDocument && instituteDocument.size > 500 * 1024) r.push("Institute document must be under 500 KB.");
    if (screenshot && screenshot.type === "application/pdf" && screenshot.size > 500 * 1024) r.push("Payment screenshot PDF must be under 500 KB.");

    const requiredFieldMap: Record<string, boolean> = {
      affiliationYear: form.zones.length > 0 && !form.affiliationYear.trim(),
      trainingPartnerName: !form.trainingPartnerName.trim(),
      trainingPartnerAddress: !form.trainingPartnerAddress.trim(),
      postalAddressOffice: !form.postalAddressOffice.trim(),
      totalName: !form.totalName.trim(),
      district: !form.district.trim(),
      state: !form.state,
      pin: !form.pin.trim(),
      mobile: !form.mobile.trim(),
      email: !form.email.trim(),
      statusOfInstitution: !form.statusOfInstitution,
      yearOfEstablishment: !form.yearOfEstablishment,
      chiefName: !form.chiefName.trim(),
      designation: !form.designation.trim(),
      educationQualification: !form.educationQualification.trim(),
      professionalExperience: !form.professionalExperience.trim(),
      dob: !form.dob.trim() || !isValidIsoDate(normalizeIsoDate(form.dob)),
      aadharNo: !form.aadharNo.trim(),
      photo: !photo,
      signature: !signature,
      aadharDoc: !aadharDoc,
      paymentMode: !form.paymentMode,
      paidAmount: form.paymentMode === "gpay" && !form.paidAmount.trim(),
      transactionNo: form.paymentMode === "gpay" && !form.transactionNo.trim(),
      paymentScreenshot: form.paymentMode === "gpay" && !screenshot,
      zones: form.zones.length === 0,
    };
    const requiredSet = new Set<string>();
    Object.entries(requiredFieldMap).forEach(([key, invalid]) => {
      if (invalid) requiredSet.add(key);
    });
    return { list: r, requiredSet };
  }, [form, feeCalculation, screenshot, photo, signature, logo, aadharDoc, marksheetDoc, otherDocs, instituteDocument]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((c) => ({ ...c, [field]: value }));
    if (invalidFields.has(field)) {
      setInvalidFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  const requiredHint = (field: string) =>
    invalidFields.has(field) ? <p className="mt-1 text-xs font-semibold text-red-700">Required field</p> : null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (errors.list.length) {
      setError(errors.list[0]);
      setInvalidFields(errors.requiredSet);
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value));
        }
      });
      if (photo) payload.append("photo", photo);
      if (logo) payload.append("logo", logo);
      if (signature) payload.append("signature", signature);
      if (aadharDoc) payload.append("aadharDoc", aadharDoc);
      if (marksheetDoc) payload.append("marksheetDoc", marksheetDoc);
      if (otherDocs) payload.append("otherDocs", otherDocs);
      if (screenshot) payload.append("paymentScreenshot", screenshot);
      if (instituteDocument) payload.append("instituteDocument", instituteDocument);
      payload.append("infrastructure", JSON.stringify(infra));
      payload.append("zones", JSON.stringify(form.zones));
      if (feeCalculation) {
        payload.append("feeCalculation", JSON.stringify(feeCalculation));
      }
      const response = await fetch("/api/become-atc", { method: "POST", body: payload });
      const data = (await response.json()) as { message?: string; refNumber?: string };
      if (!response.ok) { setError(data.message ?? "Form submission failed. Try again."); return; }
      const newRef = data.refNumber ?? Date.now().toString().slice(-6);
      setLastRefNumber(newRef);
      setReceiptData({
        refNumber: newRef,
        submitDate: new Date().toLocaleString("en-IN"),
        ...form,
        processFee: feeCalculation ? String(feeCalculation.payableAmount) : "",
        feeCalculation: feeCalculation ?? undefined,
        paymentScreenshot: screenshot ? URL.createObjectURL(screenshot) : "",
        infrastructure: infra as Record<string, InfraRow>,
      });
      setShowSuccessModal(true);
    } catch {
      setError("Network error while submitting form.");
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setForm(initialFormState); setInfra(emptyInfra);
    setPhoto(null); setLogo(null); setSignature(null); setAadharDoc(null); setMarksheetDoc(null); setOtherDocs(null);
    setScreenshot(null); setInstituteDocument(null); setError(null); setReceiptData(null);
    setFeeCalculation(null);
    setInvalidFields(new Set());
  };

  if (receiptData && !showSuccessModal) {
    return <PaymentReceipt data={receiptData} onBack={onReset} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl mb-8 shadow-xl"
        style={{ background: "linear-gradient(135deg, #0a0a2e 0%, #0a0aa1 60%, #1a1ac0 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg shrink-0">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-2">
              <CheckCircle className="w-3 h-3 text-green-300" />
              <span className="text-xs text-white/80 font-medium">Authorized Training Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Application Form
            </h1>
            <p className="text-white/70 text-sm mt-1">Apply to become an Authorized Training Center partner with {brandName || "our institution"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} onReset={onReset} className="space-y-5">
        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Upload Limit: JPG/PNG up to 100KB, PDF up to 500KB</p>

        {/* ── SECTION 1: Training Partner Info ─────────────────────── */}
        <SectionCard icon={Building2} title="Information About Training Partner" subtitle="All fields are mandatory">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Applying For (readonly) */}
            <div className="sm:col-span-2">
              <Label>Applying For</Label>
              <input className={inputCls + " bg-slate-50 cursor-default"} value="Authorized Training Partner" readOnly />
            </div>

            {/* Training Partner Name */}
            <div className="sm:col-span-2">
              <Label>Training Partner Name *</Label>
              <input className={`${inputCls} ${invalidFields.has("trainingPartnerName") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="Enter full name of the institute" value={form.trainingPartnerName}
                onChange={(e) => setField("trainingPartnerName", e.target.value)} />
              {requiredHint("trainingPartnerName")}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <Label>Training Partner Address *</Label>
              <input className={`${inputCls} ${invalidFields.has("trainingPartnerAddress") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="Full address of the institute" value={form.trainingPartnerAddress}
                onChange={(e) => setField("trainingPartnerAddress", e.target.value)} />
              {requiredHint("trainingPartnerAddress")}
            </div>


            {/* Tehsil */}
            <div>
              <Label>Tehsil / Taluka Name *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("totalName") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="Tehsil or Taluka name"
                  value={form.totalName} onChange={(e) => setField("totalName", e.target.value)} />
              </div>
              {requiredHint("totalName")}
            </div>

            {/* State */}
            <div>
              <Label>State *</Label>
              <SelectWrapper>
                <select className={`${selectCls} ${invalidFields.has("state") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} value={form.state} onChange={(e) => setStateField(e.target.value)}>
                  <option value="">— Select State —</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </SelectWrapper>
              {requiredHint("state")}
            </div>

            {/* District */}
            <div>
              <Label>District *</Label>
              <SelectWrapper>
                <select
                  className={`${selectCls} ${invalidFields.has("district") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`}
                  value={form.district}
                  onChange={(e) => setField("district", e.target.value)}
                  disabled={!form.state || districtOptions.length === 0}
                >
                  <option value="">
                    {form.state
                      ? districtOptions.length
                        ? "— Select District —"
                        : "No districts available"
                      : "Select state first"}
                  </option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </SelectWrapper>
              {requiredHint("district")}
            </div>

            {/* PIN */}
            <div>
              <Label>PIN Code *</Label>
              <input className={`${inputCls} ${invalidFields.has("pin") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="6-digit PIN code" maxLength={6}
                value={form.pin} onChange={(e) => setField("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} />
              {requiredHint("pin")}
            </div>

            {/* Country (readonly) */}
            <div>
              <Label>Country</Label>
              <input className={inputCls + " bg-slate-50 cursor-default"} value="INDIA" readOnly />
            </div>

            {/* Postal Address Office */}
            <div className="sm:col-span-2">
              <Label>Postal Address (Office) *</Label>
              <input className={`${inputCls} ${invalidFields.has("postalAddressOffice") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="Office mailing address" value={form.postalAddressOffice}
                onChange={(e) => setField("postalAddressOffice", e.target.value)} />
              {requiredHint("postalAddressOffice")}
            </div>

            {/* Mobile */}
            <div>
              <Label>Mobile Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("mobile") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="10-digit mobile number"
                  value={form.mobile} onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
              {requiredHint("mobile")}
            </div>

            {/* Email */}
            <div>
              <Label>Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" className={`${inputCls} pl-9 ${invalidFields.has("email") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="email@example.com"
                  value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              {requiredHint("email")}
            </div>

            {/* Status of Institution */}
            <div>
              <Label>Status of Institution *</Label>
              <div className="flex gap-2 flex-wrap pt-1">
                {["Trust", "Society", "Other"].map((s) => (
                  <label key={s}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition select-none
                      ${form.statusOfInstitution === s
                        ? "bg-[#0a0aa1] text-white border-[#0a0aa1] shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0a0aa1]/40"}`}>
                    <input type="radio" name="statusOfInstitution" className="sr-only"
                      checked={form.statusOfInstitution === s} onChange={() => setField("statusOfInstitution", s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Year of Establishment *</Label>
              <SelectWrapper>
                <select className={`${selectCls} ${invalidFields.has("yearOfEstablishment") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} value={form.yearOfEstablishment} onChange={(e) => setField("yearOfEstablishment", e.target.value)}>
                  <option value="">— Select Year —</option>
                  {getYearOptions(50).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </SelectWrapper>
              {requiredHint("yearOfEstablishment")}
            </div>

            {/* Institute Document */}
            <div className="sm:col-span-2">
              <Label>Institute Document (Optional) - Max 500KB (PDF/JPG/PNG)</Label>
              <label className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition ${invalidFields.has("photo") ? "border-red-600 bg-red-50/60" : "border-slate-300"}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {instituteDocument ? instituteDocument.name : "Click to upload JPG / PDF"}
                </span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setInstituteDocument(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {requiredHint("statusOfInstitution")}
          </div>
        </SectionCard>

        {/* ── SECTION: Zones ──────────────────────────────────────── */}
        <SectionCard
          icon={Layers}
          title="Zones (Select one or multiple)"
          subtitle="Zones and fees come from Admin Settings only — nothing is hardcoded here."
          color="#f59e0b"
        >
          {zoneCatalogLoading ? (
            <p className="text-sm text-slate-500 py-2">Loading zone options…</p>
          ) : zoneCatalog.length === 0 ? (
            <p className="text-sm text-amber-800 py-2">
              No affiliation zones are configured yet. Please contact the administrator.
            </p>
          ) : (
          <div className="flex flex-wrap gap-3 pt-1">
            {zoneCatalog.map((row) => (
              <label key={row.name}
                className={`flex flex-col gap-0.5 px-4 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition select-none min-w-32
                  ${form.zones.includes(row.name)
                    ? "bg-[#f59e0b] text-white border-[#f59e0b] shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#f59e0b]/40 shadow-sm"}`}>
                <input 
                  type="checkbox" 
                  className="sr-only"
                  checked={form.zones.includes(row.name)} 
                  onChange={(e) => {
                    const next = e.target.checked 
                      ? [...form.zones, row.name] 
                      : form.zones.filter(v => v !== row.name);
                    setForm(c => ({ ...c, zones: next }));
                  }} 
                />
                <span className="flex items-center gap-2">
                  {form.zones.includes(row.name) ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Layers className="w-4 h-4 opacity-40 shrink-0" />}
                  {row.name}
                </span>
                <span className={`text-[10px] font-semibold ${form.zones.includes(row.name) ? "text-amber-100" : "text-slate-400"}`}>
                  ₹{row.amount.toLocaleString("en-IN")}
                </span>
              </label>
            ))}
          </div>
          )}
          {requiredHint("zones")}
        </SectionCard>

        <AffiliationZoneFeeBlock
          zones={form.zones}
          affiliationYear={form.affiliationYear}
          onAffiliationYearChange={(y) => setField("affiliationYear", y)}
          onCalculationUpdate={onFeeCalculationUpdate}
          invalidAffiliationYear={invalidFields.has("affiliationYear")}
        />

        {/* ── SECTION 2: Chief Executive ─────────────────────────── */}
        <SectionCard icon={User} title="Information About the Chief Executive / Principal / Director" color="#7c3aed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("chiefName") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="Head's full name" value={form.chiefName}
                  onChange={(e) => setField("chiefName", e.target.value)} />
              </div>
              {requiredHint("chiefName")}
            </div>

            <div>
              <Label>Designation / Position *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("designation") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="e.g. Director, Principal" value={form.designation}
                  onChange={(e) => setField("designation", e.target.value)} />
              </div>
              {requiredHint("designation")}
            </div>

            <div>
              <Label>Education Qualification *</Label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("educationQualification") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="e.g. M.Sc, B.Ed, MBA" value={form.educationQualification}
                  onChange={(e) => setField("educationQualification", e.target.value)} />
              </div>
              {requiredHint("educationQualification")}
            </div>

            <div>
              <Label>Professional Experience *</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("professionalExperience") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="e.g. 5 Years" value={form.professionalExperience}
                  onChange={(e) => setField("professionalExperience", e.target.value)} />
              </div>
              {requiredHint("professionalExperience")}
            </div>

            <div>
              <Label>Date of Birth *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  min={ISO_DATE_MIN}
                  max={dobMax}
                  className={`${inputCls} pl-9 ${invalidFields.has("dob") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`}
                  value={form.dob}
                  onChange={(e) => setField("dob", normalizeIsoDate(e.target.value))}
                />
              </div>
              {requiredHint("dob")}
            </div>

            <div>
              <Label>Aadhar Number *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className={`${inputCls} pl-9 ${invalidFields.has("aadharNo") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : ""}`} placeholder="12-digit Aadhar number" maxLength={12}
                  value={form.aadharNo} onChange={(e) => setField("aadharNo", e.target.value.replace(/\D/g, "").slice(0, 12))} />
              </div>
              {requiredHint("aadharNo")}
            </div>

            <div>
              <Label>Passport Size Photo * - Max 100KB (JPG/PNG)</Label>
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {photo ? photo.name : "Click to choose photo"}
                </span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => {
                  setPhoto(e.target.files?.[0] ?? null);
                  setInvalidFields((prev) => {
                    const next = new Set(prev);
                    next.delete("photo");
                    return next;
                  });
                }} />
              </label>
              {requiredHint("photo")}
            </div>

            <div>
              <Label>Logo (Optional) - Max 100KB (JPG/PNG)</Label>
              <label className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition ${invalidFields.has("signature") ? "border-red-600 bg-red-50/60" : "border-slate-300"}`}>
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {logo ? logo.name : "Click to choose logo"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div>
              <Label>Signature * - Max 100KB (JPG/PNG)</Label>
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {signature ? signature.name : "Click to choose signature"}
                </span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => {
                  setSignature(e.target.files?.[0] ?? null);
                  setInvalidFields((prev) => {
                    const next = new Set(prev);
                    next.delete("signature");
                    return next;
                  });
                }} />
              </label>
              {requiredHint("signature")}
            </div>

            <div>
              <Label>Aadhar Card (PDF) * - Max 500KB</Label>
              <label className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition ${invalidFields.has("aadharDoc") ? "border-red-600 bg-red-50/60" : "border-slate-300"}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {aadharDoc ? aadharDoc.name : "Click to choose aadhar PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                  setAadharDoc(e.target.files?.[0] ?? null);
                  setInvalidFields((prev) => {
                    const next = new Set(prev);
                    next.delete("aadharDoc");
                    return next;
                  });
                }} />
              </label>
              {requiredHint("aadharDoc")}
            </div>

            <div>
              <Label>Marksheet (Optional) - Max 500KB (PDF)</Label>
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {marksheetDoc ? marksheetDoc.name : "Click to choose marksheet PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setMarksheetDoc(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div>
              <Label>Other Docs (Optional) - Max 500KB (PDF)</Label>
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {otherDocs ? otherDocs.name : "Click to choose other docs PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setOtherDocs(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </SectionCard>

        {/* ── SECTION 3: Infrastructure ──────────────────────────── */}
        <SectionCard icon={Layers} title="Infrastructure Facility" subtitle="Enter N/A if not applicable" color="#059669">
          <div className="flex justify-end mb-1 sm:hidden">
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold animate-pulse">Drag right →</span>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-120">
              <thead>
                <tr>
                  {["Particulars", "No. of Rooms", "Seating Capacity", "Total Area (Sq.Ft.)"].map((h, i) => (
                    <th key={h}
                      className={`pb-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 ${i === 0 ? "w-36" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {infraFields.map((item, rowIdx) => (
                  <Fragment key={item}>
                    <tr className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                          {item}
                        </span>
                      </td>
                      {(["rooms", "seats", "area"] as const).map((col) => (
                        <td key={col} className="py-2 pr-3">
                          <input
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition placeholder-slate-400"
                            value={infra[item][col]}
                            onChange={(e) => setInfra((c) => ({ ...c, [item]: { ...c[item], [col]: e.target.value } }))}
                          />
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ── SECTION 4: Payment Mode ────────────────────────────── */}
        <SectionCard icon={CreditCard} title="Payment Mode" subtitle="Select how you want to pay" color="#d97706">
          <div className="flex flex-wrap gap-3">
            {[
              { value: "gpay", label: "Google Pay / UPI QR", icon: "💳" },
              { value: "online", label: "Online Payment", icon: "🌐" },
            ].map((opt) => (
                <label key={opt.value}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition select-none
                  ${form.paymentMode === opt.value
                    ? "border-amber-500 bg-amber-50 shadow-sm"
                    : invalidFields.has("paymentMode")
                      ? "border-red-700 bg-red-50/60"
                    : "border-slate-200 bg-white hover:border-amber-300"}`}>
                <input type="radio" name="paymentMode" className="sr-only"
                  checked={form.paymentMode === opt.value} onChange={() => setField("paymentMode", opt.value)} />
                <span className="text-lg">{opt.icon}</span>
                <span className={`text-sm font-semibold ${form.paymentMode === opt.value ? "text-amber-700" : "text-slate-700"}`}>
                  {opt.label}
                </span>
                {form.paymentMode === opt.value && <CheckCircle className="w-4 h-4 text-amber-500 ml-auto" />}
              </label>
            ))}
          </div>
          {requiredHint("paymentMode")}

          {/* Payment Instructions & QR */}
          {form.paymentMode === "gpay" && (
            <div className="mt-6 p-4 sm:p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-4">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                {qrCode ? (
                  <div className="shrink-0 space-y-2">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Scan to Pay</p>
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-amber-200 cursor-pointer group relative"
                      onClick={() => setIsQrModalOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setIsQrModalOpen(true);
                        }
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="Payment QR" className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto transition group-hover:opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-full font-bold">CLICK TO ENLARGE</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center bg-white rounded-xl border border-dashed border-amber-300">
                    <QrCode className="w-10 h-10 text-amber-300" />
                  </div>
                )}
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mb-0.5">Total Amount Payable:</p>
                    <p className="text-2xl sm:text-3xl font-black text-amber-900 leading-none">
                      {feeCalculation
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(feeCalculation.payableAmount)
                        : "—"}
                    </p>
                    {feeCalculation && (
                      <p className="text-[10px] text-amber-500 font-medium mt-1">
                        Plan: {feeCalculation.affiliationYear}{" "}
                        {feeCalculation.affiliationYear === 1 ? "year" : "years"} @ {feeCalculation.discountPercent}%
                        discount
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] text-amber-700">1</div>
                      Scan QR & Pay Amount
                    </div>
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 pt-1">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px] text-amber-700">2</div>
                      Upload Screenshot Below
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Paid Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-sm">₹</span>
                    <input 
                      className={`w-full pl-7 pr-4 py-2 rounded-xl border bg-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition ${invalidFields.has("paidAmount") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : "border-amber-200"}`}
                      placeholder="Enter amount paid"
                      value={form.paidAmount}
                      onChange={(e) => setField("paidAmount", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  {requiredHint("paidAmount")}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-700 uppercase mb-1">Transaction No / UTR *</label>
                  <input 
                    className={`w-full px-4 py-2 rounded-xl border bg-white text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition ${invalidFields.has("transactionNo") ? "border-red-700 ring-2 ring-red-700/10 bg-red-50/40" : "border-amber-200"}`}
                    placeholder="Enter 12-digit UTR or Txn ID"
                    value={form.transactionNo}
                    onChange={(e) => setField("transactionNo", e.target.value)}
                  />
                  {requiredHint("transactionNo")}
                </div>
              </div>
            </div>
          )}

          {/* Screenshot Upload */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <Label>Upload Payment Screenshot {form.paymentMode === "gpay" && "*"} - Max 100KB (JPG/PNG)</Label>
            <p className="text-[10px] text-slate-500 mb-3 italic">Please upload a screenshot of your successful transaction for verification.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex flex-col items-center justify-center gap-2 w-full p-6 rounded-2xl border-2 border-dashed transition cursor-pointer
                ${screenshot ? "border-green-400 bg-green-50" : invalidFields.has("paymentScreenshot") ? "border-red-700 bg-red-50/60" : "border-slate-200 bg-slate-50 hover:border-amber-400 hover:bg-amber-50"}`}>
                <Camera className={`w-8 h-8 ${screenshot ? "text-green-500" : "text-slate-400"}`} />
                <div className="text-center">
                  <span className={`text-sm font-bold block ${screenshot ? "text-green-700" : "text-slate-600"}`}>
                    {screenshot ? "Change Screenshot" : "Choose File"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {screenshot ? screenshot.name : "JPEG, PNG, WebP or PDF"}
                  </span>
                </div>
                <input type="file" accept="image/*,application/pdf" className="hidden" 
                  onChange={(e) => {
                    setScreenshot(e.target.files?.[0] ?? null);
                    setInvalidFields((prev) => {
                      const next = new Set(prev);
                      next.delete("paymentScreenshot");
                      return next;
                    });
                  }} />
              </label>
              {requiredHint("paymentScreenshot")}

              {screenshot && screenshot.type.startsWith("image/") && (
                <div className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden p-2 flex flex-col items-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Preview</p>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(screenshot)} alt="Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <button type="button" onClick={() => setScreenshot(null)} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase">Remove File</button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Error Banner ───────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-950 border border-red-700 text-red-100 rounded-2xl px-5 py-4 text-sm font-medium shadow-sm">
            <div className="w-5 h-5 rounded-full bg-red-800 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-red-100 font-bold text-xs">!</span>
            </div>
            {error}
          </div>
        )}

        {/* ── Submit / Reset ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 pb-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg, #0a0aa1 0%, #1a1ac0 100%)" }}>
            {loading
              ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Submitting...</>
              : <><Send className="w-4 h-4" />Submit Application</>
            }
          </button>
          <button
            type="reset"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <Link href="/" className="ml-auto flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm transition">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </form>

      {/* QR Large Modal */}
      {isQrModalOpen && qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsQrModalOpen(false)}
          role="presentation"
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button 
              onClick={() => setIsQrModalOpen(false)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-500 hover:text-red-500 transition">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Scan to Pay</h3>
              <p className="text-sm text-slate-500">{brandName || "Institution"} Official Payment QR</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="Large Payment QR" className="w-full h-auto max-h-[60vh] object-contain mx-auto" />
            </div>
            <button 
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
              Close
            </button>
          </div>
        </div>
      )}
      {/* SUCCESS POPUP MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-[#0a0a2e]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300 text-center p-10 relative">
             <div className="absolute top-0 left-0 w-full h-2 bg-[#0a0aa1]"></div>
             <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle className="w-10 h-10 text-[#0a0aa1]" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Application Success</h3>
             <p className="text-slate-500 text-sm mb-6 leading-relaxed">Registration form submitted Successfully! <br /> Your Reference Number is: <b>{lastRefNumber}</b></p>
             <button 
               onClick={() => {
                 setShowSuccessModal(false);
               }}
               className="w-full py-4 bg-[#0a0aa1] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#0a0a2e] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
             >
               View Payment Receipt
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
