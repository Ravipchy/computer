"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { 
  GraduationCap, BookOpen, User,
  LogOut, CheckCircle, Calendar,
  MapPin, Phone, Mail, Award,
  Fingerprint, CreditCard, ShieldCheck, LayoutDashboard,
  Menu, Bell, ReceiptText,
  Eye, EyeOff, Lock, ShieldAlert
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ExamManager from "@/components/student/ExamManager";
import StudentStudyMaterial from "@/components/student/StudentStudyMaterial";
import StudentIdCard from "@/components/common/StudentIdCard";
import StudentFeeView from "@/components/student/StudentFeeView";

import { useBrand } from "@/context/BrandContext";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { cookieFetch } from "@/lib/auth-client";
import { apiFetch } from "@/utils/api";

type StudentRecord = {
  _id: string;
  name: string;
  enrollmentNo: string;
  registrationNo?: string;
  tpCode?: string;
  course: string;
  status: string;
  fatherName?: string;
  mobile?: string;
  email?: string;
  dob: string;
  state?: string;
  district?: string;
  currentAddress?: string;
  createdAt?: string;
  photo?: string;
  totalFee?: number;
  paidAmount?: number;
  duesAmount?: number;
  admissionFees?: number | string;
};

type StudentCenter = {
  tpCode?: string;
  trainingPartnerName?: string;
  trainingPartnerAddress?: string;
  mobile?: string;
  signature?: string;
};

type StudentIdBackgrounds = {
  id_front?: string;
  id_back?: string;
};

type StudentMeResponse = {
  student: Partial<StudentRecord> & {
    _id?: string;
    name?: string;
    enrollmentNo?: string;
    registrationNo?: string;
    course?: string;
    dob?: string;
    status?: string;
    totalFee?: number;
    paidAmount?: number;
    duesAmount?: number;
    admissionFees?: number | string;
  };
};

export default function StudentDashboardPage() {
  const { brandName, brandLogo } = useBrand();
  usePageTitle("student");
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [bgs, setBgs] = useState<StudentIdBackgrounds>({});
  const [center, setCenter] = useState<StudentCenter | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "exams" | "study" | "idcard" | "profile" | "fees">("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [passSaving, setPassSaving] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    apiFetch("/api/student/me")
      .then(async (res) => {
        if (!res.ok) { router.push("/student/login"); return; }
        const data = (await res.json()) as StudentMeResponse;
        const normalizedStudent: StudentRecord = {
          _id: data.student._id ?? "",
          name: data.student.name ?? "",
          enrollmentNo: data.student.enrollmentNo ?? "",
          registrationNo: data.student.registrationNo,
          course: data.student.course ?? "N/A",
          dob: data.student.dob ?? "N/A",
          status: data.student.status ?? "N/A",
          tpCode: data.student.tpCode,
          fatherName: data.student.fatherName,
          mobile: data.student.mobile,
          email: data.student.email,
          state: data.student.state,
          district: data.student.district,
          currentAddress: data.student.currentAddress,
          createdAt: data.student.createdAt,
          photo: data.student.photo,
          totalFee: Number(data.student.totalFee ?? 0),
          paidAmount: Number(data.student.paidAmount ?? 0),
          duesAmount: Number(data.student.duesAmount ?? 0),
          admissionFees: data.student.admissionFees,
        };
        setStudent(normalizedStudent);

        // Fetch backgrounds
        apiFetch("/api/public/backgrounds").then(r => r.json()).then(setBgs).catch(() => {});
        
        // Fetch his center details if he has a tpCode
        if (normalizedStudent.tpCode) {
           apiFetch(`/api/public/centers`).then(r => r.json()).then((cData: Array<{ tpCode?: string }>) => {
              const myCenter = cData?.find((a) => a.tpCode === normalizedStudent.tpCode);
              setCenter(myCenter ?? null);
           }).catch(() => {});
        }

        // Fetch history to populate fee notifications
        apiFetch(`/api/fee/history/${normalizedStudent._id}`).then(r => r.json()).then(hData => {
          const transactions = hData.transactions || [];
          const upcomingInstallment = [...transactions].reverse().find((t: any) => t.type === 'collect' && t.nextInstallmentDate && t.nextInstallmentAmount);
          const remainingDues = (normalizedStudent.totalFee || Number(normalizedStudent.admissionFees) || 0) - (normalizedStudent.paidAmount || 0);
          
          if (remainingDues > 0 && upcomingInstallment) {
            setNotifications([{
              id: upcomingInstallment._id,
              title: "Fee Installment Due",
              message: `Your next fee installment of ₹${upcomingInstallment.nextInstallmentAmount} is scheduled to be paid by ${new Date(upcomingInstallment.nextInstallmentDate).toLocaleDateString()}.`,
              date: upcomingInstallment.nextInstallmentDate
            }]);
          }
        }).catch(() => {});
      })
      .catch(() => router.push("/student/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await cookieFetch("/api/student/logout", { method: "POST" });
    router.push("/student/login");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passData.old || !passData.new) { showToast("error", "All fields are required."); return; }
    if (passData.new !== passData.confirm) { showToast("error", "Passwords do not match."); return; }
    if (passData.new.length < 6) { showToast("error", "Minimum 6 characters required."); return; }
    
    setPassSaving(true);
    try {
      const res = await cookieFetch("/api/student/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: passData.old, newPassword: passData.new }),
      });
      const data = await res.json();
      if (!res.ok) { showToast("error", data.message || "Failed to update."); return; }
      showToast("success", "Password updated successfully!");
      setPassData({ old: "", new: "", confirm: "" });
    } catch { showToast("error", "Network error."); }
    finally { setPassSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <SkeletonLoader type="dashboard" />
      </div>
    );
  }

  if (!student) return null;

  const NavItem = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: LucideIcon, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 group ${
        activeTab === tab 
          ? "bg-white text-blue-600 shadow-lg shadow-blue-900/10" 
          : "text-blue-100 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === tab ? "text-blue-600" : "text-blue-300"}`} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {activeTab === tab && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <title>Student Panel | {brandName}</title>
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-100 px-6 py-3 rounded-2xl shadow-2xl text-white text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-linear-to-b from-[#0a0a2e] to-[#0a0aa1] text-white z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full p-2">
          {/* Logo Section */}
          <div className="flex flex-col items-center text-center gap-0 mb-1 px-1 lg:mt-0">
            <div className="h-24 w-24 overflow-hidden flex items-center justify-center">
              {brandLogo ? (
                <Image src={brandLogo} alt={brandName} width={96} height={96} unoptimized className="h-full w-full object-contain scale-[1.75]" />
              ) : (
                <GraduationCap className="text-blue-400 w-7 h-7" />
              )}
            </div>
            <div className="w-full -mt-2">
              <p className="font-black text-lg leading-none tracking-tight uppercase">{brandName || "Institution Brand"}</p>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-0">Student Access</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem tab="exams" icon={Award} label="My Exams" />
            <NavItem tab="study" icon={BookOpen} label="Study Center" />
            <NavItem tab="idcard" icon={CreditCard} label="Identity Card" />
            <NavItem tab="fees" icon={ReceiptText} label="Fee Details" />
            <NavItem tab="profile" icon={User} label="Academic Profile" />
          </nav>

          {/* Support Section */}
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Support Plan</p>
              <p className="text-xs font-bold text-white mb-2 italic">Need academic help?</p>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition">
                Contact Office
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all font-bold text-sm"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-600">
              <Menu size={20} />
            </button>
            <div>
               <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight">{activeTab}</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Academic Session {new Date().getFullYear()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="flex items-center px-3 sm:px-4 py-2 rounded-xl border border-blue-200 text-blue-700 text-[10px] sm:text-xs font-bold uppercase tracking-wide hover:bg-blue-50 transition"
            >
              Back to Website
            </Link>
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 transition group">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Notifications</h3>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-4 rounded-2xl border border-slate-100 mb-2 hover:bg-slate-50 transition cursor-pointer">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <ShieldAlert size={14} className="text-red-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 mb-1">{n.title}</p>
                                <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-2">{n.message}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{new Date(n.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-4 pr-1">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 tracking-tight uppercase">{student.name}</p>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Verified Account</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-100 ring-2 ring-white">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white text-xs font-black">
                   {student.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-10 pb-10">
            
            {/* TABS CONTENT */}
            {activeTab === "dashboard" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Welcome Banner */}
                <div className="relative bg-linear-to-br from-[#0a0a2e] via-[#0a0aa1] to-blue-600 rounded-[3rem] p-10 lg:p-14 text-white shadow-2xl shadow-blue-900/20 overflow-hidden group">
                   <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-md mb-8">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{student.status} Enrollment</span>
                    </div>
                    <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tighter leading-[1.1]">
                      Shape your future with <span className="text-blue-300 italic">Precision.</span>
                    </h2>
                    <p className="text-blue-100 text-lg font-medium opacity-80 leading-relaxed mb-10">
                      Welcome, <span className="text-white font-bold">{student.name}</span>. You are currently enrolled in our specialized <span className="text-white px-2 bg-white/10 rounded-lg">{student.course}</span> program.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button onClick={() => setActiveTab("exams")} className="px-8 py-4 bg-white text-blue-900 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95">
                        Start Exam Logic
                      </button>
                      <button onClick={() => setActiveTab("idcard")} className="px-8 py-4 bg-white/10 border border-white/20 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
                        View ID Details
                      </button>
                    </div>
                   </div>
                   
                   <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                     <GraduationCap size={400} className="absolute -right-20 -top-20 transform rotate-12" />
                   </div>
                   <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-400/20 rounded-full blur-[100px]" />
                </div>

                {/* Quick Academic Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { l: 'Enrollment number', v: student.enrollmentNo, i: Fingerprint, c: 'blue' },
                     { l: 'TP Center Code', v: student.tpCode, i: MapPin, c: 'indigo' },
                     { l: 'Current Course', v: student.course, i: BookOpen, c: 'emerald' },
                     { l: 'Account Status', v: student.status, i: CheckCircle, c: 'green' }
                   ].map(card => (
                     <div key={card.l} className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 group">
                        <div className={`w-12 h-12 rounded-2xl bg-${card.c}-50 flex items-center justify-center text-${card.c}-600 mb-6 group-hover:scale-110 transition-transform`}>
                          <card.i size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.l}</p>
                        <p className="text-sm font-black text-slate-800 tracking-tight truncate">{card.v}</p>
                     </div>
                   ))}
                </div>


              </div>
            )}

            {activeTab === "exams" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ExamManager student={student} />
              </div>
            )}

            {activeTab === "study" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StudentStudyMaterial />
              </div>
            )}

            {activeTab === "idcard" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                       <div>
                         <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Virtual Identity</h2>
                         <p className="text-slate-500 font-medium mt-1">Export your official academic identification card.</p>
                       </div>
                    </div>

                    <div className="flex justify-center py-10">
                       <StudentIdCard 
                         student={{
                          ...student,
                          centerName: center?.trainingPartnerName,
                          centerAddress: center?.trainingPartnerAddress,
                          centerMobile: center?.mobile,
                          centerSign: center?.signature,
                          admissionDate: student.createdAt ? new Date(student.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "N/A"
                        }} 
                        backgrounds={{
                          front: bgs.id_front,
                          back: bgs.id_back
                        }}
                      />
                   </div>

                   <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 text-amber-800 text-sm font-medium flex gap-4">
                      <ShieldCheck className="shrink-0 text-amber-400" />
                      <p>Carry your digital ID card on your mobile during examinations. It contains your unique <span className="font-bold">enrollment number</span> and official center authorization.</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Info */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                       <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                          <User className="text-blue-600" /> Candidate Profile
                       </h3>
                       <div className="space-y-8">
                          {[
                            { l: 'Full Name', v: student.name, i: User },
                            { l: 'Father Name', v: student.fatherName, i: GraduationCap },
                            { l: 'Mobile Number', v: student.mobile, i: Phone },
                            { l: 'Email ID', v: student.email || 'Not Provided', i: Mail },
                            { l: 'Date of Birth', v: student.dob, i: Calendar },
                          ].map(it => (
                            <div key={it.l} className="flex items-center gap-5">
                               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                  <it.i size={18} />
                               </div>
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{it.l}</p>
                                  <p className="text-sm font-bold text-slate-800">{it.v}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Academic Info */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 flex flex-col">
                       <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                          <BookOpen className="text-indigo-600" /> Academic Dossier
                       </h3>
                       <div className="space-y-8 flex-1">
                          {[
                            { l: 'Enrolled Course', v: student.course, i: Award },
                            { l: 'Study Center', v: student.tpCode, i: MapPin },
                            { l: 'Enrollment number', v: student.enrollmentNo, i: Fingerprint },
                            { l: 'Status', v: student.status, i: CheckCircle },
                            { l: 'Joining Type', v: 'New Admission', i: ReceiptText },
                          ].map(it => (
                            <div key={it.l} className="flex items-center gap-5">
                               <div className="w-10 h-10 rounded-xl bg-indigo-50/50 flex items-center justify-center text-indigo-500">
                                  <it.i size={18} />
                               </div>
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{it.l}</p>
                                  <p className="text-sm font-bold text-slate-800 uppercase leading-none mt-1">{it.v}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                       
                       <div className="mt-10 p-6 bg-indigo-900 rounded-3xl text-white relative overflow-hidden">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Enrolled Program</p>
                          <p className="text-lg font-black tracking-tight">{student.course}</p>
                          <Award className="absolute -bottom-4 -right-4 w-20 h-20 opacity-10 transform rotate-12" />
                       </div>
                    </div>

                    {/* Address Block */}
                    <div className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                       <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                          <MapPin className="text-emerald-600" /> Location Details
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">State / Region</p>
                             <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{student.state}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">District</p>
                             <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{student.district}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Current Address</p>
                             <p className="text-sm font-bold text-slate-800 leading-relaxed">{student.currentAddress}</p>
                          </div>
                       </div>
                    </div>

                     {/* Security Section */}
                     <div className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                           <div>
                              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                 <Lock className="text-red-500" /> Security Settings
                              </h3>
                              <p className="text-xs text-slate-500 font-medium mt-1">Manage your account access and credentials.</p>
                           </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Password</p>
                              <div className="relative">
                                 <input 
                                    type={showOldPass ? "text" : "password"} 
                                    value={passData.old}
                                    onChange={e => setPassData(p => ({ ...p, old: e.target.value }))}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-red-100 transition" 
                                    placeholder="••••••••" 
                                 />
                                 <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Password</p>
                              <div className="relative">
                                 <input 
                                    type={showNewPass ? "text" : "password"} 
                                    value={passData.new}
                                    onChange={e => setPassData(p => ({ ...p, new: e.target.value }))}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-red-100 transition" 
                                    placeholder="Min 6 chars" 
                                 />
                                 <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                 </button>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirm Password</p>
                              <input 
                                 type="password" 
                                 value={passData.confirm}
                                 onChange={e => setPassData(p => ({ ...p, confirm: e.target.value }))}
                                 className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none focus:ring-2 focus:ring-red-100 transition" 
                                 placeholder="Repeat password" 
                               />
                           </div>
                           <div className="md:col-span-3">
                              <button 
                                 type="submit"
                                 disabled={passSaving}
                                 className="px-10 py-4 bg-red-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition transform active:scale-95 disabled:opacity-50 flex items-center gap-3"
                              >
                                 {passSaving ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <ShieldAlert size={16} />}
                                 Authenticate & Update Password
                              </button>
                           </div>
                        </form>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === "fees" && (
              <StudentFeeView student={student} center={center} />
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body * { visibility: hidden !important; }
          #student-id-card-container, #student-id-card-container * {
            visibility: visible !important;
          }
          #student-id-card-container {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) scale(1.3) !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          #student-id-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
}
