import Image from "next/image";
import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, MapPin, Calendar, Clock, User, X, QrCode, Printer, Globe, CheckCircle, Download } from "lucide-react";
import { useBrand } from "@/context/BrandContext";

type AdmitCardStudent = {
  name?: string;
  photo?: string;
  enrollmentNo?: string;
  /** Issued when admit card is released (Registration → Student registration format). */
  registrationNo?: string;
  session?: string;
  fatherName?: string;
  tpCode?: string;
  course?: string;
};

type AdmitCardExam = {
  durationMinutes?: number | string;
  examTime?: string;
  examDate?: string;
  examMode?: string;
  offlineDetails?: { preferredCenter?: string };
};

interface AdmitCardProps {
  student: AdmitCardStudent;
  exam: AdmitCardExam;
  onClose: () => void;
}

export default function AdmitCard({ student, exam, onClose }: AdmitCardProps) {
  const [background, setBackground] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { brandName, brandMobile, brandEmail, brandAddress, brandUrl } = useBrand();
  const durationMinutes = Number(exam?.durationMinutes || 0);
  const slotText = exam?.examTime
    ? `${exam.examTime} (${durationMinutes > 0 ? `${durationMinutes} mins` : "Duration as per schedule"})`
    : "Time to be announced";

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch("/api/public/assets");
        if (res.ok) {
          const assets = await res.json();
          const nextBackground = typeof assets.admit_card === "string" && assets.admit_card.trim() !== "-" ? assets.admit_card : "";
          const nextSignature = typeof assets.auth_signature === "string" && assets.auth_signature.trim() !== "-" ? assets.auth_signature : "";
          if (nextBackground) setBackground(nextBackground);
          if (nextSignature) setSignature(nextSignature);
        }
      } catch (err) {
        console.error("Failed to fetch assets", err);
      }
    };
    fetchAssets();
  }, []);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("admit-card-view");
    if (!element) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      const fileName = `${(student.registrationNo || student.enrollmentNo || "admit-card").toString().replace(/\s+/g, "-")}.pdf`;
      pdf.save(fileName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 print:p-0 print:bg-white overflow-auto">
      
      {/* Action Buttons (Floating) */}
      <div className="fixed top-8 right-8 z-110 flex flex-col gap-3 print:hidden">
        <button
          onClick={() => void handleDownloadPdf()}
          disabled={downloading}
          className="flex items-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(5,150,105,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-70"
        >
          <Download size={20} />
          {downloading ? "Generating..." : "Download PDF"}
        </button>
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-3 px-10 py-4 bg-[#0a0aa1] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(10,10,161,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          <Printer size={20} />
          Print Hall Ticket
        </button>
        <button 
          onClick={onClose} 
          className="p-4 bg-white/10 text-white backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/20 transition shadow-2xl"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full flex justify-center print:block">
        <div
          id="admit-card-view"
          className="relative bg-white overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] print:shadow-none"
          style={{
            width: "min(210mm, calc(100vw - 24px))",
            aspectRatio: "210 / 297",
          }}
        >
          
          {/* Layer 0: Background */}
          <div className="absolute inset-0 z-0">
            {background ? (
              <Image src={background} alt="Background" fill unoptimized className="object-fill pointer-events-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />
            ) : (
              <div className="w-full h-full bg-slate-50 relative">
                 <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-[#0a0aa1]/5 rounded-bl-[100%] pointer-events-none" />
                 <div className="absolute bottom-0 left-0 w-[40%] h-[20%] bg-[#0a0aa1]/5 rounded-tr-[100%] pointer-events-none" />
                 <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                    <GraduationCap size={700} />
                 </div>
              </div>
            )}
          </div>

          {/* Layer 1: Content Decor */}
          <div className="absolute inset-[15mm] border border-slate-200 pointer-events-none z-10" />

          {/* Layer 2: Actual UI */}
          <div className="relative z-20 flex flex-col h-full p-[20mm]">
            
            {/* Header: Identity & Branding */}
            <div className="flex items-center justify-between mb-12 border-b-4 border-[#0a0aa1] pb-8">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#0a0aa1] rounded-2xl flex items-center justify-center shadow-xl rotate-3">
                     <GraduationCap size={40} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2 uppercase">{brandName || "INSTITUTION"}</h1>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <span className="flex items-center gap-1"><Globe size={12} className="text-blue-500" /> {brandUrl || "Official Website"}</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full" />
                       <span>{brandEmail || brandMobile || "Official Contact"}</span>
                    </div>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-black text-[#0a0aa1] uppercase tracking-[0.3em] mb-1">Status: Valid Document</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">HALL TICKET</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Entrance Exam / Semester 2025</p>
               </div>
            </div>

            {/* Main Section: Profile & Details */}
            <div className="flex gap-16 mb-16">
               {/* Candidate Side */}
               <div className="w-[55mm] space-y-8">
                  <div className="relative aspect-3.5/4.5 w-full overflow-hidden rounded-4xl border-8 border-white bg-slate-100 shadow-2xl ring-1 ring-slate-200 group">
                    {student.photo ? (
                      <Image src={student.photo} alt="Photo" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"><User size={80} /></div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />
                  </div>

                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-100 shadow-xl flex flex-col items-center">
                     <div className="p-3 bg-white border-2 border-slate-50 rounded-2xl mb-4">
                        <QrCode size={80} className="text-slate-800" />
                     </div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate Verification</p>
                  </div>
               </div>

               {/* Particulars Side */}
               <div className="flex-1 space-y-10">
                  <div className="space-y-1">
                     <p className="text-[11px] font-black text-[#0a0aa1] uppercase tracking-[0.2em]">Full Name of Candidate</p>
                     <p className="text-5xl font-black tracking-tighter leading-tight bg-linear-to-r from-slate-900 to-[#0a0aa1] bg-clip-text text-transparent">
                        {student.name}
                     </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                     <Detail label="Enrollment number" value={student.enrollmentNo} strong />
                     <Detail label="Registration number" value={student.registrationNo || "—"} strong />
                     <Detail label="Examination Batch" value={student.session || "2025-2026"} />
                     <Detail label="Father's Guardian" value={student.fatherName} />
                     <Detail label="Associated Center" value={student.tpCode || "Official Branch"} />
                     <div className="col-span-2 p-6 bg-[#0a0aa1]/5 rounded-3xl border-l-8 border-[#0a0aa1]">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Academic Course Enrollment</p>
                        <p className="text-2xl font-black text-[#0a0aa1] uppercase tracking-tight">{student.course}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Exam Schedule: The Hero Section */}
            <div className="mb-16 relative">
               <div className="absolute -inset-4 bg-slate-900 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)]" />
               <div className="relative z-10 flex text-white p-10 items-center justify-between">
                  <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-white/10">
                           <Calendar size={20} className="text-blue-400" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Date of Examination</p>
                           <p className="text-2xl font-black">{exam.examDate ? new Date(exam.examDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'long', year: 'numeric' }) : "TO BE ANNOUNCED"}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-white/10">
                           <Clock size={20} className="text-indigo-400" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Examination Slot</p>
                           <p className="text-lg font-bold">{slotText}</p>
                        </div>
                     </div>
                  </div>

                  <div className="w-[100mm] p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm self-stretch flex flex-col justify-center">
                     <div className="flex items-center gap-3 mb-2">
                        <MapPin size={20} className="text-red-500" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Examination Center</p>
                     </div>
                     <p className="text-sm font-black uppercase text-white leading-tight">
                        {exam.examMode === 'online' ? "Candidate Digital Portal (Self Login)" : (exam.offlineDetails?.preferredCenter || "Official ATC Branch")}
                     </p>
                  </div>
               </div>
            </div>

            {/* Footer Area: Auth & Rules */}
            <div className="mt-auto grid grid-cols-2 gap-20 items-end">
               <div className="space-y-6 pb-4">
                  <div className="px-4 py-1.5 bg-slate-100 rounded-full inline-block border border-slate-200">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} className="text-emerald-600" /> Mandatory Instructions
                     </p>
                  </div>
                  <ul className="text-[10px] font-bold text-slate-400 space-y-3 pl-2">
                     <li className="flex gap-4"><span>01</span> <span>Candidate must carry this Hallmark Card & Identity Proof to the examination center.</span></li>
                     <li className="flex gap-4"><span>02</span> <span>No candidate shall be allowed to leave the hall before the examination is over.</span></li>
                     <li className="flex gap-4"><span>03</span> <span>Possession of Mobiles, Smartwatches or Calculators is strictly prohibited.</span></li>
                  </ul>
               </div>

               <div className="flex justify-between items-end">
                  <div className="text-center group">
                     <div className="w-44 h-24 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center relative overflow-hidden mb-3">
                        {signature ? (
                          <Image src={signature} alt="Sign" fill unoptimized className="object-contain relative z-10" />
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 italic">Auth Controller</span>
                        )}
                        <div className="absolute inset-0 bg-linear-to-tr from-blue-500/5 to-transparent pointer-events-none" />
                     </div>
                     <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Exam Controller</p>
                     <p className="text-[9px] font-black text-blue-700 uppercase tracking-[0.2em] mt-1">{brandName || "Institution"}</p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                     <div className="w-20 h-20 rounded-full border-4 border-blue-50 flex items-center justify-center shadow-xl ring-2 ring-blue-100/20 mb-2">
                        <ShieldCheck size={40} className="text-blue-600" />
                     </div>
                     <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                           <CheckCircle size={10} className="text-emerald-500" />
                           <p className="text-[9px] font-black text-slate-900 uppercase">Verified Hallmark</p>
                        </div>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Ref: YCE/ADM/2025</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Bottom Bar Styling */}
            <div className="absolute bottom-[10mm] left-[20mm] right-[20mm] h-1.5 bg-[#0a0aa1] rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-blue-400" />
            </div>
            <p className="absolute bottom-[5mm] left-0 w-full text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] opacity-40">
              {(brandAddress || "Digitally issued official document")} — {(brandMobile || "Unauthorized replication is prohibited")}
            </p>
          </div>
        </div>

        {/* Global Print Optimized Styling */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body * { visibility: hidden !important; }
            #admit-card-view, #admit-card-view * { visibility: visible !important; }
            #admit-card-view {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              aspect-ratio: auto !important;
              padding: 0 !important;
              border: none !important;
              visibility: visible !important;
            }
          }
          #admit-card-view {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        ` }} />
      </div>
    </div>
  );
}

function Detail({ label, value, strong = false }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="space-y-1">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
       <p className={`text-sm ${strong ? 'text-2xl font-black text-[#0a0aa1]' : 'text-slate-800 font-bold'} uppercase leading-tight`}>
          {value || "---"}
       </p>
    </div>
  );
}
