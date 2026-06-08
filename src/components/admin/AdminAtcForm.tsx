"use client";

import { Fragment, type FormEvent, useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import {
  Building2, User, Layers, CreditCard, ChevronDown,
  Send, RotateCcw, CheckCircle, MapPin, Phone, Mail,
  BookOpen, Briefcase, Calendar, Camera, ShieldCheck, FileText, X, QrCode,
  Eye, EyeOff, ExternalLink
} from "lucide-react";
import { DISTRICTS_BY_STATE, getYearOptions } from "@/utils/atcSettings";
import type { FeeCalculationSnapshot, ZoneFeeRow } from "@/utils/affiliationFeeShared";
import AffiliationZoneFeeBlock from "@/components/affiliation/AffiliationZoneFeeBlock";
import { useBrand } from "@/context/BrandContext";
import { ISO_DATE_MIN, isValidIsoDate, normalizeIsoDate } from "@/lib/isoDate";

type InfrastructureRow = { rooms: string; seats: string; area: string };
type FormState = {
  affiliationYear: string; trainingPartnerName: string; trainingPartnerAddress: string;
  postalAddressOffice: string; zones: string[];
  totalName: string; district: string; state: string; pin: string; country: string;
  mobile: string; email: string; statusOfInstitution: string; yearOfEstablishment: string;
  chiefName: string; designation: string; educationQualification: string;
  professionalExperience: string; dob: string; paymentMode: string;
  paidAmount: string; transactionNo: string; password?: string;
};

const initialFormState: FormState = {
  affiliationYear: "", trainingPartnerName: "", trainingPartnerAddress: "", postalAddressOffice: "", zones: [],
  totalName: "", district: "", state: "", pin: "", country: "INDIA", mobile: "", email: "",
  statusOfInstitution: "", yearOfEstablishment: "", chiefName: "", designation: "",
  educationQualification: "", professionalExperience: "", dob: "", paymentMode: "",
  paidAmount: "", transactionNo: "", password: "",
};

const infraFields = ["Staff Room", "Class Room", "Computer Lab", "Reception", "Toilets", "Any Other"] as const;
const emptyInfra: Record<(typeof infraFields)[number], InfrastructureRow> = {
  "Staff Room": { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Class Room": { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Computer Lab": { rooms: "N/A", seats: "N/A", area: "N/A" },
  Reception: { rooms: "N/A", seats: "N/A", area: "N/A" },
  Toilets: { rooms: "N/A", seats: "N/A", area: "N/A" },
  "Any Other": { rooms: "N/A", seats: "N/A", area: "N/A" },
};
const INDIAN_STATES = Object.keys(DISTRICTS_BY_STATE);

// Styles from BecomeAtcForm
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

interface Props {
  onSuccess: () => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
  applicationId?: string;
  initialData?: Partial<FormState> & {
    photo?: string;
    logo?: string;
    signature?: string;
    aadharDoc?: string;
    marksheetDoc?: string;
    otherDocs?: string;
    paymentScreenshot?: string;
    instituteDocument?: string;
    infrastructure?: string;
    status?: string;
    _id?: string;
    affiliationPlanYear?: number;
    feeCalculation?: FeeCalculationSnapshot | null;
  };
}

export default function AdminAtcForm({ onSuccess, onCancel, mode = "create", applicationId, initialData }: Props) {
  const { brandName } = useBrand();
  const { user: authUser } = useAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [aadharDoc, setAadharDoc] = useState<File | null>(null);
  const [aadharPreview, setAadharPreview] = useState<string | null>(null);
  const [marksheetDoc, setMarksheetDoc] = useState<File | null>(null);
  const [marksheetPreview, setMarksheetPreview] = useState<string | null>(null);
  const [otherDocs, setOtherDocs] = useState<File | null>(null);
  const [otherPreview, setOtherPreview] = useState<string | null>(null);

  const [instituteDocument, setInstituteDocument] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [infra, setInfra] = useState<Record<(typeof infraFields)[number], InfrastructureRow>>(emptyInfra);
  const [loading, setLoading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculationSnapshot | null>(null);
  const onFeeCalculationUpdate = useCallback((c: FeeCalculationSnapshot | null) => {
    setFeeCalculation(c);
  }, []);
  const [zoneCatalog, setZoneCatalog] = useState<ZoneFeeRow[]>([]);
  const [zoneCatalogLoading, setZoneCatalogLoading] = useState(true);
  const [showPass, setShowPass] = useState(true);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [viewingDoc, setViewingDoc] = useState<{ url: string; title: string; type: "image" | "pdf" } | null>(null);

  const openDoc = (file: File | null, preview: string | null, title: string, defaultType: "image" | "pdf" = "image") => {
    const url = file ? URL.createObjectURL(file) : (preview || "");
    if (!url) return;
    
    let type = defaultType;
    // Auto-detect type if it's a data URL or blob
    if (url.startsWith("data:application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      type = "pdf";
    } else if (url.startsWith("data:image/") || url.includes("blob:")) {
      // Keep default or assume image if it's blob/data and not pdf
    }
    
    setViewingDoc({ url, title, type });
  };

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;
    setForm((current) => ({
      ...current,
      affiliationYear:
        initialData.affiliationPlanYear != null && initialData.affiliationPlanYear > 0
          ? String(initialData.affiliationPlanYear)
          : initialData.feeCalculation?.affiliationYear
            ? String(initialData.feeCalculation.affiliationYear)
            : current.affiliationYear,
      trainingPartnerName: initialData.trainingPartnerName ?? current.trainingPartnerName,
      trainingPartnerAddress: initialData.trainingPartnerAddress ?? current.trainingPartnerAddress,
      postalAddressOffice: initialData.postalAddressOffice ?? current.postalAddressOffice,
      zones: initialData.zones ?? current.zones,
      totalName: initialData.totalName ?? current.totalName,
      district: initialData.district ?? current.district,
      state: initialData.state ?? current.state,
      pin: initialData.pin ?? current.pin,
      country: initialData.country ?? current.country,
      mobile: initialData.mobile ?? current.mobile,
      email: initialData.email ?? current.email,
      statusOfInstitution: initialData.statusOfInstitution ?? current.statusOfInstitution,
      yearOfEstablishment: initialData.yearOfEstablishment ?? current.yearOfEstablishment,
      chiefName: initialData.chiefName ?? current.chiefName,
      designation: initialData.designation ?? current.designation,
      educationQualification: initialData.educationQualification ?? current.educationQualification,
      professionalExperience: initialData.professionalExperience ?? current.professionalExperience,
      dob: initialData.dob ?? current.dob,
      paymentMode: initialData.paymentMode ?? current.paymentMode,
      paidAmount: initialData.paidAmount ?? current.paidAmount,
      transactionNo: initialData.transactionNo ?? current.transactionNo,
      password: initialData.mobile ?? "",
    }));

    setPhotoPreview(initialData.photo ?? null);
    setLogoPreview(initialData.logo ?? null);
    setSigPreview(initialData.signature ?? null);
    setAadharPreview(initialData.aadharDoc ?? null);
    setMarksheetPreview(initialData.marksheetDoc ?? null);
    setOtherPreview(initialData.otherDocs ?? null);
    setScreenshotPreview(initialData.paymentScreenshot ?? null);
    setDocPreview(initialData.instituteDocument ?? null);

    try {
      setInfra({
        ...emptyInfra,
        ...(initialData.infrastructure ? JSON.parse(initialData.infrastructure) : {}),
      });
    } catch {
      setInfra(emptyInfra);
    }

    if (initialData.feeCalculation) {
      setFeeCalculation(initialData.feeCalculation);
    }
  }, [mode, initialData]);

  useEffect(() => {
    if (!authUser) return;
    apiFetch("/api/admin/settings?key=qr_code")
      .then((res) => res.json())
      .then((data) => setQrCode(data.value))
      .catch(() => {});
  }, [authUser]);

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
    if (form.zones.length > 0 && !form.affiliationYear.trim()) r.push("Please select affiliation period (years).");
    if (form.zones.length > 0 && form.affiliationYear.trim() && !feeCalculation) {
      r.push("Fee could not be calculated. Try re-selecting the affiliation period.");
    }
    if (!form.trainingPartnerName.trim()) r.push("Training partner name is required.");
    if (!form.trainingPartnerAddress.trim()) r.push("Training partner address is required.");
    if (!form.postalAddressOffice.trim()) r.push("Postal address is required.");
    if (!form.totalName.trim()) r.push("Tehsil / Taluka name is required.");
    if (form.zones.length === 0) r.push("Please select at least one zone.");
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
    if (!photo && !photoPreview) r.push("Passport size photo is required.");
    if (!signature && !sigPreview) r.push("Signature is required.");
    if (!aadharDoc && !aadharPreview) r.push("Aadhar card PDF is required.");
    if (!form.paymentMode) r.push("Please select payment mode.");
    if (form.paymentMode === "gpay") {
      if (!form.paidAmount.trim()) r.push("Please enter paid amount.");
      if (!form.transactionNo.trim()) r.push("Please enter transaction / UTR number.");
    }
    
    // For visual highlighting
    const fieldMap: Record<string, boolean> = {
      affiliationYear: form.zones.length > 0 && !form.affiliationYear.trim(),
      trainingPartnerName: !form.trainingPartnerName.trim(),
      trainingPartnerAddress: !form.trainingPartnerAddress.trim(),
      postalAddressOffice: !form.postalAddressOffice.trim(),
      totalName: !form.totalName.trim(),
      district: !form.district.trim(),
      state: !form.state,
      pin: !/^\d{6}$/.test(form.pin),
      mobile: !/^\d{10}$/.test(form.mobile),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
      statusOfInstitution: !form.statusOfInstitution,
      yearOfEstablishment: !form.yearOfEstablishment,
      chiefName: !form.chiefName.trim(),
      designation: !form.designation.trim(),
      educationQualification: !form.educationQualification.trim(),
      professionalExperience: !form.professionalExperience.trim(),
      dob: !form.dob.trim() || !isValidIsoDate(normalizeIsoDate(form.dob)),
      paymentMode: !form.paymentMode,
      paidAmount: form.paymentMode === "gpay" && !form.paidAmount.trim(),
      transactionNo: form.paymentMode === "gpay" && !form.transactionNo.trim(),
      photo: !photo && !photoPreview,
      signature: !signature && !sigPreview,
      aadharDoc: !aadharDoc && !aadharPreview,
      zones: form.zones.length === 0,
    };
    
    const invalidSet = new Set<string>();
    Object.entries(fieldMap).forEach(([k, v]) => { if (v) invalidSet.add(k); });
    
    return { list: r, set: invalidSet };
  }, [form, feeCalculation, photo, photoPreview, signature, sigPreview, aadharDoc, aadharPreview]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((c) => ({ ...c, [field]: value }));
    if (invalidFields.has(field)) {
      setInvalidFields(prev => {
        const n = new Set(prev);
        n.delete(field);
        return n;
      });
    }
  };

  const requiredHint = (field: string) =>
    invalidFields.has(field) ? <p className="mt-1 text-xs font-bold text-red-900">Required field</p> : null;

  const onReset = () => {
    if (mode === "edit" && initialData) {
      setForm((current) => ({
        ...current,
        affiliationYear:
          initialData.affiliationPlanYear != null && initialData.affiliationPlanYear > 0
            ? String(initialData.affiliationPlanYear)
            : initialData.feeCalculation?.affiliationYear
              ? String(initialData.feeCalculation.affiliationYear)
              : current.affiliationYear,
        trainingPartnerName: initialData.trainingPartnerName ?? current.trainingPartnerName,
        trainingPartnerAddress: initialData.trainingPartnerAddress ?? current.trainingPartnerAddress,
        postalAddressOffice: initialData.postalAddressOffice ?? current.postalAddressOffice,
        zones: initialData.zones ?? current.zones,
        totalName: initialData.totalName ?? current.totalName,
        district: initialData.district ?? current.district,
        state: initialData.state ?? current.state,
        pin: initialData.pin ?? current.pin,
        country: initialData.country ?? current.country,
        mobile: initialData.mobile ?? current.mobile,
        email: initialData.email ?? current.email,
        statusOfInstitution: initialData.statusOfInstitution ?? current.statusOfInstitution,
        yearOfEstablishment: initialData.yearOfEstablishment ?? current.yearOfEstablishment,
        chiefName: initialData.chiefName ?? current.chiefName,
        designation: initialData.designation ?? current.designation,
        educationQualification: initialData.educationQualification ?? current.educationQualification,
        professionalExperience: initialData.professionalExperience ?? current.professionalExperience,
        dob: initialData.dob ?? current.dob,
        paymentMode: initialData.paymentMode ?? current.paymentMode,
        paidAmount: initialData.paidAmount ?? current.paidAmount,
        transactionNo: initialData.transactionNo ?? current.transactionNo,
        password: initialData.mobile ?? "",
      }));
      setInfra(initialData.infrastructure ? JSON.parse(initialData.infrastructure) : emptyInfra);
      setPhoto(null);
      setScreenshot(null);
      setInstituteDocument(null);
      setMessage(null);
      setPhotoPreview(initialData.photo ?? null);
      setLogoPreview(initialData.logo ?? null);
      setSigPreview(initialData.signature ?? null);
      setAadharPreview(initialData.aadharDoc ?? null);
      setMarksheetPreview(initialData.marksheetDoc ?? null);
      setOtherPreview(initialData.otherDocs ?? null);
      setScreenshotPreview(initialData.paymentScreenshot ?? null);
      setDocPreview(initialData.instituteDocument ?? null);
      setFeeCalculation(initialData.feeCalculation ?? null);
      setInvalidFields(new Set());
      return;
    }

    setForm(initialFormState); setInfra(emptyInfra);
    setPhoto(null); setLogo(null); setSignature(null); setAadharDoc(null); setMarksheetDoc(null); setOtherDocs(null);
    setScreenshot(null); setInstituteDocument(null); setMessage(null);
    setPhotoPreview(null); setLogoPreview(null); setSigPreview(null); setAadharPreview(null); setMarksheetPreview(null); setOtherPreview(null);
    setScreenshotPreview(null); setDocPreview(null);
    setFeeCalculation(null);
    setInvalidFields(new Set());
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    onReset();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (errors.list.length) { 
      setMessage({ type: "error", text: errors.list[0] }); 
      setInvalidFields(errors.set);
      requestAnimationFrame(() => {
        const firstInvalid = document.querySelector(
          "input.border-red-800, select.border-red-800, label.border-red-800"
        ) as HTMLElement | null;
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }

    // Client-side file size validation
    const fileChecks = [
      { file: photo, name: "Photo", limit: 100 },
      { file: logo, name: "Logo", limit: 100 },
      { file: signature, name: "Signature", limit: 100 },
      { file: aadharDoc, name: "Aadhar PDF", limit: 500 },
      { file: marksheetDoc, name: "Marksheet PDF", limit: 500 },
      { file: otherDocs, name: "Other Docs PDF", limit: 500 },
      { file: screenshot, name: "Payment Screenshot", limit: 100 },
      { file: instituteDocument, name: "Institute Document", limit: 500 },
    ];

    for (const check of fileChecks) {
      if (check.file && check.file.size > check.limit * 1024) {
        setMessage({ type: "error", text: `${check.name} is too large. Max limit is ${check.limit}KB.` });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
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
      if (photo) {
        payload.append("photo", photo);
      } else if (photoPreview) {
        payload.append("existingPhoto", photoPreview);
      }
      if (form.password) {
        payload.append("customPassword", form.password);
      }
      if (logo) {
        payload.append("logo", logo);
      } else if (logoPreview) {
        payload.append("existingLogo", logoPreview);
      }
      if (signature) {
        payload.append("signature", signature);
      } else if (sigPreview) {
        payload.append("existingSignature", sigPreview);
      }
      if (aadharDoc) {
        payload.append("aadharDoc", aadharDoc);
      } else if (aadharPreview) {
        payload.append("existingAadharDoc", aadharPreview);
      }
      if (marksheetDoc) {
        payload.append("marksheetDoc", marksheetDoc);
      } else if (marksheetPreview) {
        payload.append("existingMarksheetDoc", marksheetPreview);
      }
      if (otherDocs) {
        payload.append("otherDocs", otherDocs);
      } else if (otherPreview) {
        payload.append("existingOtherDocs", otherPreview);
      }
      if (screenshot) {
        payload.append("paymentScreenshot", screenshot);
      } else if (screenshotPreview) {
        payload.append("existingPaymentScreenshot", screenshotPreview);
      }
      if (instituteDocument) {
        payload.append("instituteDocument", instituteDocument);
      } else if (docPreview) {
        payload.append("existingInstituteDocument", docPreview);
      }
      payload.append("infrastructure", JSON.stringify(infra));
      if (feeCalculation) {
        payload.append("feeCalculation", JSON.stringify(feeCalculation));
      }

      const url = mode === "edit" && applicationId
        ? `/api/admin/applications/${applicationId}`
        : "/api/admin/applications";
      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await apiFetch(url, { 
        method, 
        body: payload,
      });
      const data = (await response.json()) as { message: string, tpCode?: string, mobile?: string };
      
      if (!response.ok) { 
        setMessage({ type: "error", text: data.message || "Something went wrong" }); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return; 
      }

      const successText = mode === "edit"
        ? "✅ Application updated successfully."
        : data.tpCode
          ? `✅ ATC Approved! ID: ${data.tpCode} | Pass: ${data.mobile}`
          : "ATC application created successfully!";

      setMessage({ type: "success", text: successText });
      
      // Delay for success message visibility then call onSuccess
      setTimeout(() => {
        onReset();
        onSuccess();
      }, 2000);

    } catch (err: unknown) {
      console.error(err);
      setMessage({ type: "error", text: "Network error while submitting form." });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={onSubmit} onReset={onReset} className="space-y-5">
      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Upload Limit: JPG/PNG up to 100KB, PDF up to 500KB</p>
      
      {/* ── SECTION 1: Training Partner Info ─────────────────────── */}
      <SectionCard icon={Building2} title="Information About Training Partner" subtitle="All fields are mandatory">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Applying For</Label>
            <input className={inputCls + " bg-slate-50 cursor-default"} value="Authorized Training Partner" readOnly />
          </div>

          <div className="sm:col-span-2">
            <Label>Training Partner Name *</Label>
            <input 
              className={`${inputCls} ${invalidFields.has("trainingPartnerName") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
              placeholder="Enter full name of the institute" value={form.trainingPartnerName}
              onChange={(e) => setField("trainingPartnerName", e.target.value)} />
            {requiredHint("trainingPartnerName")}
          </div>

          <div className="sm:col-span-2">
            <Label>Training Partner Address *</Label>
            <input 
              className={`${inputCls} ${invalidFields.has("trainingPartnerAddress") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
              placeholder="Full address of the institute" value={form.trainingPartnerAddress}
              onChange={(e) => setField("trainingPartnerAddress", e.target.value)} />
            {requiredHint("trainingPartnerAddress")}
          </div>


          <div>
            <Label>Tehsil / Taluka Name *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("totalName") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="Tehsil or Taluka name"
                value={form.totalName} onChange={(e) => setField("totalName", e.target.value)} />
            </div>
            {requiredHint("totalName")}
          </div>

          <div>
            <Label>State *</Label>
            <SelectWrapper>
              <select 
                className={`${selectCls} ${invalidFields.has("state") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                value={form.state} onChange={(e) => setStateField(e.target.value)}
              >
                <option value="">— Select State —</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </SelectWrapper>
            {requiredHint("state")}
          </div>

          <div>
            <Label>District *</Label>
            <SelectWrapper>
              <select
                className={`${selectCls} ${invalidFields.has("district") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`}
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
                {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </SelectWrapper>
            {requiredHint("district")}
          </div>

          <div>
            <Label>PIN Code *</Label>
            <input 
              className={`${inputCls} ${invalidFields.has("pin") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
              placeholder="6-digit PIN code" maxLength={6}
              value={form.pin} onChange={(e) => setField("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} />
            {requiredHint("pin")}
          </div>

          <div>
            <Label>Country</Label>
            <input className={inputCls + " bg-slate-50 cursor-default"} value="INDIA" readOnly />
          </div>

          <div className="sm:col-span-2">
            <Label>Postal Address (Office) *</Label>
            <input 
              className={`${inputCls} ${invalidFields.has("postalAddressOffice") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
              placeholder="Office mailing address" value={form.postalAddressOffice}
              onChange={(e) => setField("postalAddressOffice", e.target.value)} />
            {requiredHint("postalAddressOffice")}
          </div>

          <div>
            <Label>Mobile Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("mobile") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="10-digit mobile number"
                value={form.mobile} onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </div>
            {requiredHint("mobile")}
          </div>

          <div>
            <Label>Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="email" 
                className={`${inputCls} pl-9 ${invalidFields.has("email") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="email@example.com"
                value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            {requiredHint("email")}
          </div>

          <div>
            <Label>Status of Institution *</Label>
            <div className={`flex gap-2 flex-wrap pt-1 rounded-xl ${invalidFields.has("statusOfInstitution") ? "bg-red-950/10 border border-red-800 p-2" : ""}`}>
              {["Trust", "Society", "Other"].map((s) => (
                <label key={s}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition select-none
                    ${form.statusOfInstitution === s
                      ? "bg-[#0a0aa1] text-white border-[#0a0aa1] shadow-sm"
                      : invalidFields.has("statusOfInstitution")
                        ? "bg-red-950 text-red-100 border-red-800"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0a0aa1]/40"}`}>
                  <input type="radio" name="statusOfInstitution" className="sr-only"
                    checked={form.statusOfInstitution === s} onChange={() => setField("statusOfInstitution", s)} />
                  {s}
                </label>
              ))}
            </div>
            {requiredHint("statusOfInstitution")}
          </div>

          <div>
            <Label>Year of Establishment *</Label>
            <SelectWrapper>
              <select 
                className={`${selectCls} ${invalidFields.has("yearOfEstablishment") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                value={form.yearOfEstablishment} onChange={(e) => setField("yearOfEstablishment", e.target.value)}
              >
                <option value="">— Select Year —</option>
                {getYearOptions(50).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </SelectWrapper>
            {requiredHint("yearOfEstablishment")}
          </div>

          <div className="sm:col-span-2">
            <Label>Institute Document (Optional) - Max 500KB (PDF/JPG/PNG)</Label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {instituteDocument ? instituteDocument.name : docPreview ? "Institute Document Available" : "Click to upload JPG / PDF"}
                </span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setInstituteDocument(e.target.files?.[0] ?? null)} />
              </label>

              {(instituteDocument || docPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldCheck className="w-6 h-6 text-slate-400" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Institution Record</p>
                      <button type="button" onClick={() => openDoc(instituteDocument, docPreview, "Institute Document", "pdf")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-900 transition shadow-sm">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION: Zones ──────────────────────────────────────── */}
      <SectionCard
        icon={Layers}
        title="Zones (Select one or multiple)"
        subtitle="Loaded from saved Affiliation zones &amp; fees — no hardcoded list."
        color="#f59e0b"
      >
        {zoneCatalogLoading ? (
          <p className="text-sm text-slate-500 py-2">Loading zone options…</p>
        ) : zoneCatalog.length === 0 ? (
          <p className="text-sm text-amber-200/90 py-2">
            No zones in settings. Open Admin → Affiliation zones &amp; fees and save at least one zone first.
          </p>
        ) : (
        <div className={`flex flex-wrap gap-3 pt-1 rounded-xl ${invalidFields.has("zones") ? "bg-red-950/10 border border-red-800 p-2" : ""}`}>
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
        variant="admin"
        invalidAffiliationYear={invalidFields.has("affiliationYear")}
      />

      {/* ── SECTION 2: Chief Executive ─────────────────────────── */}
      <SectionCard icon={User} title="Information About the Chief Executive / Principal / Director" color="#7c3aed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("chiefName") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="Head's full name" value={form.chiefName}
                onChange={(e) => setField("chiefName", e.target.value)} />
            </div>
            {requiredHint("chiefName")}
          </div>

          <div>
            <Label>Designation / Position *</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("designation") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="e.g. Director, Principal" value={form.designation}
                onChange={(e) => setField("designation", e.target.value)} />
            </div>
            {requiredHint("designation")}
          </div>

          <div>
            <Label>Education Qualification *</Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("educationQualification") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="e.g. M.Sc, B.Ed, MBA" value={form.educationQualification}
                onChange={(e) => setField("educationQualification", e.target.value)} />
            </div>
            {requiredHint("educationQualification")}
          </div>

          <div>
            <Label>Professional Experience *</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className={`${inputCls} pl-9 ${invalidFields.has("professionalExperience") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                placeholder="e.g. 5 Years" value={form.professionalExperience}
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
                className={`${inputCls} pl-9 ${invalidFields.has("dob") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} 
                value={form.dob}
                onChange={(e) => setField("dob", normalizeIsoDate(e.target.value))} />
            </div>
            {requiredHint("dob")}
          </div>

          <div>
            <Label>Passport Size Photo * - Max 100KB (JPG/PNG)</Label>
            <div className="space-y-2">
              <label 
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition
                  ${invalidFields.has("photo") ? "border-red-800 bg-red-950/10 ring-2 ring-red-800/20" : "border-slate-300 bg-slate-50 hover:border-[#0a0aa1]/40 hover:bg-slate-100"}`}>
                <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {photo ? photo.name : photoPreview ? "Photo Uploaded" : "Click to choose photo"}
                </span>
                <input type="file" accept="image/*" className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPhoto(f);
                    if (f && invalidFields.has("photo")) {
                      setInvalidFields(prev => { const n = new Set(prev); n.delete("photo"); return n; });
                    }
                  }} />
              </label>
              {requiredHint("photo")}
              {(photo || photoPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-16 h-16 rounded-xl border-2 border-white bg-white overflow-hidden shrink-0 shadow-md">
                      <Image src={photo ? URL.createObjectURL(photo) : photoPreview!} alt="Preview" width={64} height={64} unoptimized className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Photo Preview</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openDoc(photo, photoPreview, "Applicant Photo", "image")} 
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition shadow-sm">
                          <ExternalLink className="w-3 h-3" /> View
                        </button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Logo (Optional) - Max 100KB (JPG/PNG)</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {logo ? logo.name : logoPreview ? "Logo Uploaded" : "Click to choose logo"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
              </label>
              {(logo || logoPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-20 h-20 rounded-xl border-2 border-white bg-white overflow-hidden shrink-0 shadow-md flex items-center justify-center p-1.5">
                      <Image src={logo ? URL.createObjectURL(logo) : logoPreview!} alt="Logo" width={80} height={80} unoptimized className="max-w-full max-h-full object-contain" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Logo Preview</p>
                      <button type="button" onClick={() => openDoc(logo, logoPreview, "Center Logo", "image")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-900 transition shadow-sm">
                        <ExternalLink className="w-3 h-3" /> View
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Signature * - Max 100KB (JPG/PNG)</Label>
            <div className="space-y-2">
              <label 
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition
                  ${invalidFields.has("signature") ? "border-red-800 bg-red-950/10 ring-2 ring-red-800/20" : "border-slate-300 bg-slate-50 hover:border-[#0a0aa1]/40 hover:bg-slate-100"}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {signature ? signature.name : sigPreview ? "Signature Uploaded" : "Click to choose signature"}
                </span>
                <input type="file" accept="image/*" className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setSignature(f);
                    if (f && invalidFields.has("signature")) {
                      setInvalidFields(prev => { const n = new Set(prev); n.delete("signature"); return n; });
                    }
                  }} />
              </label>
              {requiredHint("signature")}
              {(signature || sigPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/50 border border-amber-100 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-20 h-12 rounded-lg border-2 border-white bg-white overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                      <Image src={signature ? URL.createObjectURL(signature) : sigPreview!} alt="Signature" width={80} height={48} unoptimized className="max-w-full max-h-full object-contain contrast-125" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Signature</p>
                      <button type="button" onClick={() => openDoc(signature, sigPreview, "Digital Signature", "image")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition shadow-sm">
                        <ExternalLink className="w-3 h-3" /> View
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Aadhar Card (PDF) * - Max 500KB</Label>
            <div className="space-y-2">
              <label 
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition
                  ${invalidFields.has("aadharDoc") ? "border-red-800 bg-red-950/10 ring-2 ring-red-800/20" : "border-slate-300 bg-slate-50 hover:border-[#0a0aa1]/40 hover:bg-slate-100"}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {aadharDoc ? aadharDoc.name : aadharPreview ? "Aadhar Uploaded" : "Click to choose aadhar PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAadharDoc(f);
                    if (f && invalidFields.has("aadharDoc")) {
                       setInvalidFields(prev => { const n = new Set(prev); n.delete("aadharDoc"); return n; });
                    }
                  }} />
              </label>
              {requiredHint("aadharDoc")}
              {(aadharDoc || aadharPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-12 h-12 rounded-xl bg-white border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-6 h-6 text-red-500" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Aadhar Document (PDF)</p>
                      <button type="button" onClick={() => openDoc(aadharDoc, aadharPreview, "Aadhar Card PDF", "pdf")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-red-700 transition shadow-sm">
                        <ExternalLink className="w-3 h-3" /> View PDF
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Marksheet (Optional) - Max 500KB (PDF)</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {marksheetDoc ? marksheetDoc.name : marksheetPreview ? "Marksheet Uploaded" : "Click to choose marksheet PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setMarksheetDoc(e.target.files?.[0] ?? null)} />
              </label>
              {(marksheetDoc || marksheetPreview) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 w-full animate-in fade-in slide-in-from-top-1">
                   <div className="w-12 h-12 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-6 h-6 text-emerald-500" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Marksheet (PDF)</p>
                      <button type="button" onClick={() => openDoc(marksheetDoc, marksheetPreview, "Marksheet PDF", "pdf")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition shadow-sm">
                        <ExternalLink className="w-3 h-3" /> View PDF
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Other Docs (Optional) - Max 500KB (PDF)</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-[#0a0aa1]/40 hover:bg-slate-100 transition">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  {otherDocs ? otherDocs.name : otherPreview ? "Other Docs Uploaded" : "Click to choose other docs PDF"}
                </span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setOtherDocs(e.target.files?.[0] ?? null)} />
              </label>
              {(otherDocs || otherPreview) && (
                <button type="button" onClick={() => window.open(otherDocs ? URL.createObjectURL(otherDocs) : otherPreview!, '_blank')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 w-fit text-[10px] font-bold text-slate-600 uppercase">
                   <ExternalLink className="w-3 h-3" /> View Documents
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION 3: Infrastructure ──────────────────────────── */}
      <SectionCard icon={Layers} title="Infrastructure Facility" subtitle="Enter N/A if not applicable" color="#059669">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-120">
            <thead>
              <tr>
                {["Particulars", "No. of Rooms", "Seating Capacity", "Total Area (Sq.Ft.)"].map((h, i) => (
                  <th key={h} className={`pb-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 ${i === 0 ? "w-36" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {infraFields.map((item) => (
                <Fragment key={item}>
                  <tr className="border-t border-slate-200">
                    <td className="py-2 pr-3 font-semibold text-slate-600">{item}</td>
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

      {/* ── SECTION 4: Payment ────────────────────────────────────────────── */}
      <SectionCard icon={CreditCard} title="Action & Payment" subtitle="Manual override for Admin" color="#d97706">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <Label>Payment Mode *</Label>
             <div className={`flex flex-wrap gap-3 rounded-xl ${invalidFields.has("paymentMode") ? "bg-red-950/10 border border-red-800 p-2" : ""}`}>
              {[
                { value: "gpay", label: "Google Pay (Manual)" },
                { value: "online", label: "Online (Manual)" },
              ].map((opt) => (
                <label key={opt.value}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 cursor-pointer transition select-none
                    ${form.paymentMode === opt.value
                      ? "border-amber-500 bg-amber-50 shadow-sm"
                      : invalidFields.has("paymentMode")
                        ? "border-red-800 bg-red-950/10"
                        : "border-slate-200 bg-white hover:border-amber-300"}`}>
                  <input type="radio" name="paymentMode" className="sr-only"
                    checked={form.paymentMode === opt.value} onChange={() => setField("paymentMode", opt.value)} />
                  <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {requiredHint("paymentMode")}

            {form.paymentMode === "gpay" && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
                <div className="flex items-center gap-4">
                  {qrCode ? (
                    <div className="shrink-0 p-1.5 bg-white rounded-lg shadow-sm border border-amber-200 cursor-pointer group relative"
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
                      <img src={qrCode} alt="QR" className="w-20 h-20 object-contain transition group-hover:opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                         <span className="bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">VIEW</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-white rounded-lg border border-dashed border-amber-300">
                      <QrCode className="w-6 h-6 text-amber-300" />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-amber-600 font-bold uppercase">Total Payable:</p>
                    <p className="text-xl font-black text-amber-900 leading-none">
                      {feeCalculation
                        ? new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(feeCalculation.payableAmount)
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Paid Amount *</Label>
                    <input className={`${inputCls} ${invalidFields.has("paidAmount") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} placeholder="₹ Amount" value={form.paidAmount}
                      onChange={(e) => setField("paidAmount", e.target.value.replace(/\D/g, ""))} />
                    {requiredHint("paidAmount")}
                  </div>
                  <div>
                    <Label>Txn No / UTR *</Label>
                    <input className={`${inputCls} ${invalidFields.has("transactionNo") ? "border-red-800 ring-2 ring-red-800/20 bg-red-950/10" : ""}`} placeholder="UTR ID" value={form.transactionNo}
                      onChange={(e) => setField("transactionNo", e.target.value)} />
                    {requiredHint("transactionNo")}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label>Payment Screenshot (Optional) - Max 100KB (JPG/PNG)</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-amber-400 hover:bg-amber-50/10 transition">
                  <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 truncate">
                    {screenshot ? screenshot.name : screenshotPreview ? "Screenshot Available" : "Upload Payment Screenshot"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} />
                </label>
                
                {(screenshot || screenshotPreview) && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                    <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-sm p-1">
                      <Image src={screenshot ? URL.createObjectURL(screenshot) : screenshotPreview!} alt="Payment" width={48} height={48} unoptimized className="max-w-full max-h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Payment Record</p>
                      <button type="button" onClick={() => openDoc(screenshot, screenshotPreview, "Payment Record", "image")} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition">
                        <ExternalLink className="w-3 h-3" /> View Large
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
            <Label>Portal Password {mode === "edit" ? "(You can edit before saving)" : "(Default is Mobile Number)"}</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
                <input 
                type={showPass ? "text" : "password"}
                className={inputCls + " pl-9 pr-9"} 
                placeholder={mode === "edit" ? "Enter new password (optional)" : "Set custom password"}
                  value={form.password} 
                  onChange={(e) => setField("password", e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>


      {/* ── SECTION: Credentials ────────────────────────────────── */}
      <SectionCard icon={ShieldCheck} title="Center Credentials" subtitle="Login information for the ATC portal" color="#6366f1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label>Portal Password</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <input 
                type={showPass ? "text" : "password"}
                className={`${inputCls} pl-9 pr-9`} 
                placeholder={mode === "edit" ? "Enter new password (optional)" : "Set login password"}
                value={form.password} onChange={(e) => setField("password", e.target.value)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider">Shown value is editable. Save to apply as new login password.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── Message Banner ───────────────────────────────────────── */}
      {message && (
        <div className={`flex items-start gap-3 border rounded-2xl px-5 py-4 text-sm font-medium shadow-sm ${message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-950 border-red-700 text-red-100"}`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${message.type === "success" ? "bg-green-100" : "bg-red-800"}`}>
            {message.type === "success" ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="font-bold text-xs">!</span>}
          </div>
          {message.text}
        </div>
      )}

      {/* ── Submit / Reset ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg, #0a0aa1 0%, #1a1ac0 100%)" }}>
          {loading
            ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Processing...</>
            : <><Send className="w-4 h-4" />{mode === "edit" ? "Save Changes" : "Create & Approve ATC"}</>
          }
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleCancelClick}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            type="reset"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>
      
      {/* QR Large Modal */}
      {isQrModalOpen && qrCode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsQrModalOpen(false)}
          role="presentation"
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button 
              type="button"
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
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
              Close
            </button>
          </div>
        </div>
      )}
      {/* ── Document Preview Modal ─────────────────────────────── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl h-full flex flex-col bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
             <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{viewingDoc.title}</h4>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{viewingDoc.type === "pdf" ? "Portable Document Format" : "Image Preview"}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setViewingDoc(null)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 transition shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
             </div>
             
             <div className="flex-1 overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
                {viewingDoc.type === "pdf" ? (
                  <iframe src={viewingDoc.url} className="w-full h-full rounded-xl shadow-inner bg-white" title="PDF Preview" />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={viewingDoc.url} alt="Document" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                  </div>
                )}
             </div>
             
             <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <p className="text-xs font-bold text-slate-400 italic">Secure Internal Viewer</p>
                <div className="flex items-center gap-3">
                   <button 
                     type="button" 
                     onClick={() => window.open(viewingDoc.url, "_blank")}
                     className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition"
                    >
                      Open in New Tab
                    </button>
                   <button 
                     type="button" 
                     onClick={() => setViewingDoc(null)}
                     className="px-8 py-2.5 bg-[#0a0aa1] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a0aa1]/90 transition shadow-lg shadow-blue-100"
                    >
                      Close
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </form>
  );
}
