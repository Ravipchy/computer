"use client";

import { useMemo, useRef, useState, useEffect, type FormEvent } from "react";
import { CheckCircle, FileText, User, MapPin, CreditCard, Plus, Trash2 } from "lucide-react";
import { useBrand } from "@/context/BrandContext";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import HighestQualificationMultiSelect from "@/components/common/HighestQualificationMultiSelect";
import {
  formatHighestQualificationMulti,
  type QualificationSelectValue,
} from "@/lib/qualificationOptions";
import { ISO_DATE_MIN, isoDateToday, sanitizeIsoDateInput } from "@/lib/isoDate";

interface Course {
  _id: string;
  name: string;
  courseFee?: number;
}

interface Center {
  tpCode: string;
  trainingPartnerName: string;
}

type CredentialDocumentType =
  | "marksheet10th"
  | "marksheet12th"
  | "graduationDoc"
  | "highestQualDoc"
  | "aadharDoc"
  | "otherDocs";

type CredentialEntry = {
  id: string;
  courseName: string;
  schoolName: string;
  courseTitle: string;
  yearPassing: string;
  obtained: string;
  documentFile: File | null;
};

const createCredentialEntry = (): CredentialEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  courseName: "",
  schoolName: "",
  courseTitle: "",
  yearPassing: "",
  obtained: "",
  documentFile: null,
});

const guessCredentialDocumentType = (courseName: string): CredentialDocumentType => {
  const text = courseName.toLowerCase();
  if (text.includes("10") || text.includes("matric")) return "marksheet10th";
  if (text.includes("12") || text.includes("inter")) return "marksheet12th";
  if (text.includes("grad") || text.includes("b.a") || text.includes("b.sc") || text.includes("b.com")) return "graduationDoc";
  if (text.includes("aadhar") || text.includes("aadhaar")) return "aadharDoc";
  if (text.includes("post") || text.includes("master") || text.includes("pg")) return "highestQualDoc";
  return "otherDocs";
};

const QUALIFICATION_KEYS = new Set(["Below matric", "10th", "12th", "Graduation", "Other"]);

export default function DirectAdmissionForm() {
  const todayIso = useMemo(() => isoDateToday(), []);
  const { brandName } = useBrand();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableCenters, setAvailableCenters] = useState<Center[]>([]);
  const [sameAddress, setSameAddress] = useState(false);
  const [currentAddr, setCurrentAddr] = useState("");
  const [disability, setDisability] = useState("No");
  const [qualSelected, setQualSelected] = useState<QualificationSelectValue[]>([]);
  const [qualOther, setQualOther] = useState("");
  const [qualSchool, setQualSchool] = useState("");
  const [qualYearPassing, setQualYearPassing] = useState("");
  const [qualPercent, setQualPercent] = useState("");
  const [credentialEntries, setCredentialEntries] = useState<CredentialEntry[]>([]);
  const [draftCredential, setDraftCredential] = useState<CredentialEntry>(createCredentialEntry());
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [admissionDate, setAdmissionDate] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [centersLoaded, setCentersLoaded] = useState(false);
  const [selectedCourseName, setSelectedCourseName] = useState("");

  const selectedCourseDetails = useMemo(() => {
    return availableCourses.find(c => c.name === selectedCourseName);
  }, [availableCourses, selectedCourseName]);

  useEffect(() => {
    setIsMounted(true);
    void fetchCourses();
    void fetchCenters();
    setAdmissionDate(isoDateToday());
  }, []);

  useEffect(() => {
    const selectedQualification = qualSelected[0] === "Other" ? (qualOther.trim() || "Other") : (qualSelected[0] || "");
    setDraftCredential((prev) => {
      const shouldAutoMap = !prev.courseName.trim() || QUALIFICATION_KEYS.has(prev.courseName.trim());
      if (!shouldAutoMap) return prev;
      return { ...prev, courseName: selectedQualification };
    });
  }, [qualSelected, qualOther]);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/public/courses");
      if (res.ok) {
        const data = await res.json();
        setAvailableCourses(Array.isArray(data) ? data : (data.courses || []));
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await fetch("/api/public/centers");
      if (res.ok) {
        const data = await res.json();
        setAvailableCenters(Array.isArray(data) ? data : (data.centers || []));
      }
    } catch (err) {
      console.error("Failed to fetch centers", err);
    } finally {
      setCentersLoaded(true);
    }
  };

  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const requiredInputs = formEl.querySelectorAll("[required]");
    const invalid = new Set<string>();
    
    requiredInputs.forEach((el) => {
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      ) {
        const emptyFile =
          el instanceof HTMLInputElement &&
          el.type === "file" &&
          (!el.files || el.files.length === 0);
        if (!el.value || emptyFile) {
          if (el.name) invalid.add(el.name);
        }
      }
    });

    const fileInputs = formEl.querySelectorAll("input[type='file']");
    let fileError = "";
    fileInputs.forEach((el) => {
      if (!(el instanceof HTMLInputElement)) return;
      const input = el;
      const file = input.files?.[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          if (file.size > 100 * 1024) {
            invalid.add(input.name);
            fileError = "Image files (Photo, Signature, etc) must be under 100 KB.";
          }
        } else if (file.type === "application/pdf") {
          if (file.size > 500 * 1024) {
            invalid.add(input.name);
            fileError = "PDF documents (Aadhar, Marksheets, etc) must be under 500 KB.";
          }
        }
      }
    });

    if (invalid.size > 0) {
      setInvalidFields(invalid);
      setMsg({ type: "error", text: fileError || "Please fill all required fields highlighted in red." });
      return;
    }
    setInvalidFields(new Set());
    
    setLoading(true);
    setMsg({ type: "success", text: "Processing your admission request..." });

    try {
      const form = new FormData(formEl);
      if (sameAddress) form.set("permanentAddress", currentAddr);
      const filledCredentialEntries = credentialEntries.filter((entry) =>
        Boolean(
          entry.courseName.trim() ||
          entry.schoolName.trim() ||
          entry.yearPassing.trim() ||
          entry.obtained.trim() ||
          entry.documentFile
        )
      );
      const firstCredential = filledCredentialEntries[0];

      form.set("highestQualification", formatHighestQualificationMulti(qualSelected, qualOther));
      form.set("qualSchool", firstCredential?.schoolName.trim() || qualSchool);
      form.set("qualSchoolOther", "");
      form.set("qualYearPassing", firstCredential?.yearPassing.trim() || qualYearPassing);
      form.set("qualPercentObtained", firstCredential?.obtained.trim() || qualPercent);
      form.set(
        "credentialEntries",
        JSON.stringify(
          filledCredentialEntries.map((entry) => ({
            courseName: entry.courseName.trim(),
            schoolName: entry.schoolName.trim(),
            courseTitle: entry.courseTitle.trim(),
            yearPassing: entry.yearPassing.trim(),
            obtained: entry.obtained.trim(),
            documentType: guessCredentialDocumentType(entry.courseName),
            documentName: entry.documentFile?.name || "",
          }))
        )
      );

      const mappedDocs = new Set<CredentialDocumentType>();
      for (const entry of filledCredentialEntries) {
        const docType = guessCredentialDocumentType(entry.courseName);
        if (entry.documentFile && !mappedDocs.has(docType)) {
          form.set(docType, entry.documentFile);
          mappedDocs.add(docType);
        }
      }

      const res = await fetch("/api/direct-admission", { 
        method: "POST", 
        body: form 
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit admission form");
      }

      setMsg({ type: "success", text: "Admission form submitted successfully! We will contact you soon." });
      formEl.reset();
      setSameAddress(false);
      setCurrentAddr("");
      setDisability("No");
      setQualSelected([]);
      setQualOther("");
      setQualSchool("");
      setQualYearPassing("");
      setQualPercent("");
      setCredentialEntries([]);
      setDraftCredential(createCredentialEntry());
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDraftCredential = <K extends keyof CredentialEntry>(field: K, value: CredentialEntry[K]) => {
    setDraftCredential((prev) => ({ ...prev, [field]: value }));
  };

  const addCredentialEntry = () => {
    const next = {
      ...draftCredential,
      courseName: draftCredential.courseName.trim(),
      schoolName: draftCredential.schoolName.trim(),
      courseTitle: draftCredential.courseTitle.trim(),
      yearPassing: draftCredential.yearPassing.trim(),
      obtained: draftCredential.obtained.trim(),
    };
    if (!next.courseName || !next.schoolName || !next.courseTitle || !next.yearPassing || !next.obtained) {
      setMsg({ type: "error", text: "Please fill qualification, school/college, course name, year, and obtained before adding." });
      return;
    }
    setCredentialEntries((prev) => [...prev, { ...next, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
    setDraftCredential((prev) => ({ ...createCredentialEntry(), courseName: prev.courseName }));
  };

  const removeCredentialEntry = (id: string) => {
    setCredentialEntries((prev) => prev.filter((entry) => entry.id !== id));
  };
  const shouldShowCredentialEntries = qualSelected.length > 0 || qualOther.trim().length > 0;

  const inputCls = (name?: string) => `w-full px-4 py-2.5 bg-white border ${invalidFields.has(name || "") ? "border-red-800 bg-red-50/60 ring-4 ring-red-100" : "border-slate-200"} rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition placeholder:text-slate-400`;
  const labelCls = (name?: string) =>
    `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${invalidFields.has(name || "") ? "text-red-800 after:ml-2 after:text-[10px] after:font-black after:tracking-normal after:text-red-700 after:content-['Required_field']" : "text-slate-500"}`;
  const sectionCls = "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5";

  if (!isMounted) return <div className="p-8"><SkeletonLoader type="dashboard" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-blue-700 uppercase tracking-tighter mb-1">{brandName}</h1>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Direct Admission Portal</h2>
        <p className="text-slate-500 font-medium text-sm italic">Official enrollment gateway for {brandName} students</p>
      </div>

      {msg && (
        <div className={`mb-8 p-4 rounded-2xl text-sm font-bold border animate-in fade-in slide-in-from-top-2 ${msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <form ref={formRef} onSubmit={handleAddSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* 1. Personal Information */}
        <div className={sectionCls}>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide border-l-4 border-blue-500 pl-3">
            <User className="w-4 h-4 text-blue-500" /> Student Identity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className={labelCls("name")}>Full Name (as per ID) *</label>
              <input required name="name" className={inputCls("name")} placeholder="Student's Legal Name" />
            </div>
            <div>
              <label className={labelCls("fatherName")}>{"Father's Name *"}</label>
              <input required name="fatherName" className={inputCls("fatherName")} placeholder="Father's Name" />
            </div>
            <div>
              <label className={labelCls("motherName")}>{"Mother's Name *"}</label>
              <input required name="motherName" className={inputCls("motherName")} placeholder="Mother's Name" />
            </div>
            <div>
              <label className={labelCls("dob")}>Date of Birth *</label>
              <input
                required
                type="date"
                name="dob"
                className={inputCls("dob")}
                min={ISO_DATE_MIN}
                max={todayIso}
                onInput={(e) => {
                  const target = e.currentTarget;
                  target.value = sanitizeIsoDateInput(target.value);
                }}
              />
            </div>
            <div>
              <label className={labelCls("gender")}>Gender *</label>
              <select required name="gender" className={inputCls("gender")}>
                <option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div><label className={labelCls("category")}>Category *</label>
              <select required name="category" className={inputCls("category")}>
                <option>General</option><option>OBC</option><option>SC</option><option>ST</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-2">
            <div><label className={labelCls("nationality")}>Nationality</label><input name="nationality" defaultValue="Indian" className={inputCls("nationality")} /></div>
            <div><label className={labelCls("religion")}>Religion</label>
              <select name="religion" className={inputCls("religion")}>
                <option value="">Select</option><option>Hindu</option><option>Muslim</option><option>Christian</option><option>Jain</option><option>Buddhism</option><option>Other</option>
              </select>
            </div>
            <div><label className={labelCls("maritalStatus")}>Marital Status</label>
              <select name="maritalStatus" className={inputCls("maritalStatus")}>
                <option value="">Select</option>
                <option>Married</option>
                <option>Unmarried</option>
                <option>Others</option>
              </select>
            </div>
            <div>
              <label className={labelCls("disability")}>Physically Disability *</label>
              <select required name="disability" className={inputCls("disability")} value={disability} onChange={e => setDisability(e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            {disability === "Yes" && (
              <div className="md:col-span-4 animate-in zoom-in-95 duration-200">
                <label className={labelCls("disabilityDetails")}>Disability Details *</label>
                <input required={disability === "Yes"} name="disabilityDetails" className={inputCls("disabilityDetails")} placeholder="Please describe provide details" />
              </div>
            )}
          </div>
        </div>

        {/* 2. Total Fee Details */}
        <div className={sectionCls}>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide border-l-4 border-emerald-500 pl-3">
            <CreditCard className="w-4 h-4 text-emerald-500" /> Total Fee Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
               <label className={labelCls("courseType")}>Preference Mode *</label>
               <select required name="courseType" className={inputCls("courseType")}>
                  <option value="Regular">Regular</option>
                  <option value="ODL (Open Distance Learning)">ODL (Open Distance Learning)</option>
               </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls("centerCode")}>Select Training Center *</label>
               <select required name="centerCode" className={inputCls("centerCode")} disabled={!centersLoaded || availableCenters.length === 0}>
                <option value="">
                  {!centersLoaded ? "Loading Centers..." : availableCenters.length > 0 ? "Select Study Center" : "No active centers found"}
                </option>
                {availableCenters.map(c => (
                  <option key={c.tpCode} value={c.tpCode}>{c.trainingPartnerName} ({c.tpCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls("session")}>Session *</label>
              <input required name="session" className={inputCls("session")} placeholder="e.g. 2024-25" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls("course")}>Course *</label>
              <select 
                required 
                name="course" 
                className={inputCls("course")} 
                disabled={availableCourses.length === 0}
                value={selectedCourseName}
                onChange={(e) => setSelectedCourseName(e.target.value)}
              >
                <option value="">{availableCourses.length > 0 ? "Select Course" : "Loading Courses..."}</option>
                {availableCourses.map(c => (
                  <option key={c._id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {selectedCourseDetails && selectedCourseDetails.courseFee !== undefined ? (
                <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
                  Total Course Fee (INR): ₹{selectedCourseDetails.courseFee}
                </div>
              ) : null}
            </div>
            <div>
              <label className={labelCls("examMode")}>Exam Mode *</label>
              <select required name="examMode" className={inputCls("examMode")}>
                <option value="online">Online Mode</option>
                <option value="offline">Offline Mode (Center Based)</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className={labelCls("admissionDate")}>Admission Date *</label>
              <input
                required
                type="date"
                name="admissionDate"
                className={inputCls("admissionDate")}
                value={admissionDate}
                min={ISO_DATE_MIN}
                max={todayIso}
                onChange={(e) => setAdmissionDate(sanitizeIsoDateInput(e.target.value))}
                onInput={(e) => {
                  const target = e.currentTarget;
                  target.value = sanitizeIsoDateInput(target.value);
                }}
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>

        {/* 3. Contact information */}
        <div className={sectionCls}>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide border-l-4 border-amber-500 pl-3">
            <MapPin className="w-4 h-4 text-amber-500" /> Contact & Residence
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className={labelCls("mobile")}>Student Mobile *</label><input required name="mobile" className={inputCls("mobile")} placeholder="10-digit primary number" maxLength={10} /></div>
            <div><label className={labelCls("parentsMobile")}>Parents Mobile</label><input name="parentsMobile" className={inputCls("parentsMobile")} placeholder="Emergency contact" maxLength={10} /></div>
            <div className="md:col-span-2"><label className={labelCls("email")}>Email Address *</label><input required type="email" name="email" className={inputCls("email")} placeholder="Student's email ID" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
            <div>
              <label className={labelCls("currentAddress")}>Current Address *</label>
              <textarea 
                required 
                name="currentAddress" 
                rows={3} 
                className={inputCls("currentAddress")} 
                placeholder="Complete block, post, city address" 
                value={currentAddr}
                onChange={(e) => setCurrentAddr(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls("permanentAddress")}>Permanent Address *</label>
                <label className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full cursor-pointer hover:bg-green-100 transition border border-green-100">
                  <input 
                    type="checkbox" 
                    className="w-3 h-3 rounded border-green-300 text-green-600 focus:ring-green-500"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                  />
                  SAME AS CURRENT
                </label>
              </div>
              <textarea 
                required={!sameAddress}
                disabled={sameAddress}
                name="permanentAddress" 
                rows={3} 
                className={`${inputCls("permanentAddress")} ${sameAddress ? "bg-slate-50/50 text-slate-400 border-dashed" : ""}`}
                placeholder={sameAddress ? "Mailing address is same as current" : "Official residence address"}
                value={sameAddress ? currentAddr : undefined}
              />
            </div>
          </div>
        </div>

        {/* 4. Credentials & Docs */}
        <div className={sectionCls}>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide border-l-4 border-purple-500 pl-3">
            <FileText className="w-4 h-4 text-purple-500" /> Credentials & Documentation
          </h4>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Upload Limit: JPG/PNG up to 100KB, PDF up to 500KB</p>
          <div className="space-y-5">
            <HighestQualificationMultiSelect
              selected={qualSelected}
              otherDetail={qualOther}
              onSelectedChange={setQualSelected}
              onOtherDetailChange={setQualOther}
              labelCls={labelCls}
              inputCls={inputCls}
            />
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="space-y-3">
                {credentialEntries.length > 0 && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Added Details</p>
                )}
                {credentialEntries.map((entry, index) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-[11px] font-bold text-slate-600">
                      Details for: <span className="text-slate-900">{entry.courseName.trim() || `Qualification ${index + 1}`}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div><label className={labelCls("courseName")}>Qualification</label><input type="text" value={entry.courseName} readOnly className={`${inputCls("courseName")} py-2.5 bg-slate-50`} /></div>
                      <div><label className={labelCls("qualSchool")}>School / College</label><input type="text" value={entry.schoolName} readOnly className={`${inputCls("qualSchool")} py-2.5 bg-slate-50`} /></div>
                      <div><label className={labelCls("courseTitle")}>Course Name</label><input type="text" value={entry.courseTitle} readOnly className={`${inputCls("courseTitle")} py-2.5 bg-slate-50`} /></div>
                      <div><label className={labelCls("qualYearPassing")}>Year of Passing</label><input type="text" value={entry.yearPassing} readOnly className={`${inputCls("qualYearPassing")} py-2.5 bg-slate-50`} /></div>
                      <div><label className={labelCls("qualPercentObtained")}>Obtained / Grade</label><input type="text" value={entry.obtained} readOnly className={`${inputCls("qualPercentObtained")} py-2.5 bg-slate-50`} /></div>
                      <div className="flex items-end gap-2">
                        <span className="text-[10px] font-semibold text-slate-500">
                          {entry.documentFile?.name || "No file"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCredentialEntry(entry.id)}
                          className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {shouldShowCredentialEntries ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 mt-3">
                  <p className="mb-2 text-[11px] font-bold text-slate-700">Add qualification details</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls("courseName")}>Qualification</label>
                      <input
                        type="text"
                        value={draftCredential.courseName}
                        readOnly
                        className={`${inputCls("courseName")} py-2.5 bg-slate-50`}
                        placeholder="e.g. 10th, 12th, Graduation"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={labelCls("qualSchool")}>School / College</label>
                      <input
                        type="text"
                        value={draftCredential.schoolName}
                        onChange={(e) => updateDraftCredential("schoolName", e.target.value)}
                        className={`${inputCls("qualSchool")} py-2.5`}
                        placeholder="Institution name"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={labelCls("courseTitle")}>Course Name</label>
                      <input
                        type="text"
                        value={draftCredential.courseTitle}
                        onChange={(e) => updateDraftCredential("courseTitle", e.target.value)}
                        className={`${inputCls("courseTitle")} py-2.5`}
                        placeholder="e.g. Science, Commerce, BCA"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={labelCls("qualYearPassing")}>Year of Passing</label>
                      <input
                        type="text"
                        value={draftCredential.yearPassing}
                        onChange={(e) =>
                          updateDraftCredential("yearPassing", e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        className={`${inputCls("qualYearPassing")} py-2.5`}
                        placeholder="YYYY"
                        inputMode="numeric"
                        maxLength={4}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={labelCls("qualPercentObtained")}>Obtained / Grade</label>
                      <input
                        type="text"
                        value={draftCredential.obtained}
                        onChange={(e) => updateDraftCredential("obtained", e.target.value)}
                        className={`${inputCls("qualPercentObtained")} py-2.5`}
                        placeholder="e.g. 72% / A Grade"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className={labelCls("credentialDoc")}>Upload Document (Max 500KB)</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => updateDraftCredential("documentFile", e.target.files?.[0] ?? null)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:uppercase file:text-slate-700 file:cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={addCredentialEntry}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-800 hover:bg-blue-200"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Select qualification to continue.
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls("aadharNo")}>Aadhar Number</label><input name="aadharNo" className={`${inputCls("aadharNo")} py-3 text-base`} placeholder="12-digit UID" maxLength={12} /></div>
              <div><label className={labelCls("referredBy")}>Referred By</label><input name="referredBy" className={`${inputCls("referredBy")} py-3 text-base`} placeholder="Staff or Partner name" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {[
                { label: "Student Photo (JPG/PNG) * - Max 100KB", name: "photo", required: true },
                { label: "Student Signature (JPG/PNG) * - Max 100KB", name: "studentSignature", required: true },
              ].map(doc => (
                <div key={doc.name} className={`group relative p-3 rounded-2xl border transition-all ${invalidFields.has(doc.name) ? "border-red-700 bg-red-50/50 ring-4 ring-red-50" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200"}`}>
                  <label className={`block text-[10px] font-black uppercase mb-2 tracking-tighter ${invalidFields.has(doc.name) ? "text-red-800" : "text-slate-400 group-hover:text-blue-500"}`}>
                    {doc.label}
                    {invalidFields.has(doc.name) && <span className="ml-1 normal-case text-[10px] tracking-normal text-red-700">Required field</span>}
                  </label>
                  <input 
                    type="file" 
                    name={doc.name} 
                    required={doc.required}
                    accept="image/*,application/pdf" 
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[10px] file:font-black file:uppercase file:text-slate-700 file:cursor-pointer"
                  />
                </div>
              ))}
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button disabled={loading} type="submit" className="w-full md:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-75">
            {loading ? <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"/> : <CheckCircle className="w-5 h-5" />}
            {loading ? "SUBMITTING..." : "SUBMIT APPLICATION"}
          </button>
        </div>
      </form>
    </div>
  );
}
