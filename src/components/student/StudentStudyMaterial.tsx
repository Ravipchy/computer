"use client";

import { useState, useEffect, useMemo } from "react";
import { Play, FileText, Type, Download, Eye, Search, Filter, Layers, Copy, CheckCircle, ShieldCheck, MapPin } from "lucide-react";
import SkeletonLoader from "@/components/common/SkeletonLoader";

interface Material {
  _id: string;
  title: string;
  description?: string;
  category: string;
  type: "video" | "pdf" | "text";
  content: string;
  uploadedBy: "admin" | "atc";
  createdAt: string;
}

export default function StudentStudyMaterial() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | "video" | "pdf" | "text">("all");
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await fetch("/api/student/study-material");
        const data = await res.json();
        setMaterials(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void fetchMaterials();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category));
    return ["all", ...Array.from(cats)];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || 
                          m.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "all" || m.category === selectedCategory;
      const matchType = selectedType === "all" || m.type === selectedType;
      return matchSearch && matchCat && matchType;
    });
  }, [materials, search, selectedCategory, selectedType]);

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8">
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Study Center</h2>
           <p className="text-slate-500 font-medium mt-1">Access your videos, notes and academic resources</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition" />
              <input 
                type="text" 
                placeholder="Search materials..." 
                className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition min-w-[280px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           
           <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 gap-1">
              {(["all", "video", "pdf", "text"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${selectedType === t ? "bg-[#0a0aa1] text-white shadow-lg shadow-blue-100" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Categories Scroller */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
         {categories.map(cat => (
           <button
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`shrink-0 px-6 py-2.5 rounded-2xl border-2 text-xs font-black uppercase tracking-tight transition-all ${
               selectedCategory === cat ? "border-[#0a0aa1] bg-blue-50 text-[#0a0aa1]" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
             }`}
           >
             {cat === "all" ? <Layers className="w-4 h-4 inline-block mr-2" /> : null}
             {cat}
           </button>
         ))}
      </div>

      {/* Main Content */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-100 p-32 text-center">
             <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200">
                <Filter className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">No match found</h3>
             <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Adjust your filters or try a different search term to find what you're looking for.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredMaterials.map(m => (
             <div key={m._id} className="group bg-white rounded-[40px] border border-slate-200 p-2 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all duration-500 flex flex-col relative overflow-hidden">
                {/* Visual Header */}
                <div className="aspect-[4/3] rounded-[32px] bg-slate-50 flex items-center justify-center relative overflow-hidden group-hover:scale-[0.98] transition-transform duration-500">
                   {m.type === "video" ? (
                      <div className="w-full h-full relative cursor-pointer" onClick={() => setActiveMaterial(m)}>
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={`https://img.youtube.com/vi/${m.content}/maxresdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt="" />
                         <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition duration-500 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 flex items-center justify-center text-white group-hover:scale-125 transition duration-500">
                               <Play className="w-8 h-8 fill-current" />
                            </div>
                         </div>
                      </div>
                   ) : m.type === "pdf" ? (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50/50 group-hover:bg-blue-50 transition duration-500">
                         <FileText className="w-20 h-20 text-blue-600/20 group-hover:text-blue-600/40 group-hover:scale-110 transition duration-500" />
                      </div>
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-50/50 group-hover:bg-emerald-50 transition duration-500">
                         <Type className="w-20 h-20 text-emerald-600/20 group-hover:text-emerald-600/40 group-hover:scale-110 transition duration-500" />
                      </div>
                   )}

                   <div className="absolute top-6 left-6 flex flex-col gap-2">
                       <div className="px-4 py-2 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0aa1]">{m.category}</span>
                       </div>
                       <div className={`px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                         m.uploadedBy === 'admin' 
                          ? 'bg-blue-600 text-white border-blue-500' 
                          : 'bg-emerald-600 text-white border-emerald-500'
                       }`}>
                         {m.uploadedBy === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                         {m.uploadedBy === 'admin' ? 'H.O. Verified' : 'Center Resource'}
                       </div>
                   </div>
                </div>

                {/* Body Content */}
                 <div className="px-8 py-6 mb-2 flex-grow">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${m.type === "video" ? "bg-red-500" : m.type === "pdf" ? "bg-blue-500" : "bg-emerald-500"}`} />
                          <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">{m.type === "video" ? "Watch Video" : m.type === "pdf" ? "Document File" : "Readable Notes"}</span>
                       </div>
                       <span className="text-[9px] font-bold text-slate-300 italic">{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 leading-tight mb-3 line-clamp-2 transition-colors group-hover:text-blue-600">{m.title}</h4>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed h-10 mb-4">{m.description || "No description provided."}</p>
                    
                    <div className="flex items-center gap-3 pt-6 border-t border-slate-50 mt-auto">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.uploadedBy === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {m.uploadedBy === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                       </div>
                       <div>
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Source Identity</p>
                          <p className="text-[10px] font-bold text-slate-800 uppercase">{m.uploadedBy === 'admin' ? 'Head Office Academy' : 'Your Learning Center'}</p>
                       </div>
                    </div>
                 </div>

                {/* footer buttons */}
                <div className="p-4 pt-0">
                   {m.type === "video" && (
                     <button 
                        onClick={() => setActiveMaterial(m)}
                        className="w-full bg-[#0a0aa1] text-white font-black py-5 rounded-[28px] text-xs uppercase tracking-widest hover:bg-[#080885] transition-all hover:shadow-2xl shadow-blue-100 flex items-center justify-center gap-3"
                      >
                       <Play className="w-4 h-4 fill-current" /> Watch Lesson
                     </button>
                   )}

                   {m.type === "pdf" && (
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                           onClick={() => setActiveMaterial(m)}
                           className="bg-slate-100 text-slate-800 font-black py-5 rounded-[28px] text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                           <Eye className="w-4 h-4" /> View
                        </button>
                        <a 
                           href={m.content} 
                           download
                           target="_blank"
                           className="bg-blue-600 text-white font-black py-5 rounded-[28px] text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                           <Download className="w-4 h-4" /> Download
                        </a>
                     </div>
                   )}

                   {m.type === "text" && (
                     <div className="grid grid-cols-2 gap-3">
                        <button 
                           onClick={() => setActiveMaterial(m)}
                           className="bg-emerald-600 text-white font-black py-5 rounded-[28px] text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                           <Eye className="w-4 h-4" /> Read Notes
                        </button>
                        <button 
                           onClick={() => handleCopy(m.content, m._id)}
                           className="bg-slate-100 text-slate-800 font-black py-5 rounded-[28px] text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                           {copiedId === m._id ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                           {copiedId === m._id ? "Copied" : "Copy"}
                        </button>
                     </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Detail Viewer Modal */}
      {activeMaterial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8 animate-in fade-in duration-300">
           <div className="w-full max-w-6xl flex flex-col h-full rounded-[40px] bg-white overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500">
              <div className="absolute top-8 right-8 z-50">
                 <button onClick={() => setActiveMaterial(null)} className="w-14 h-14 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-xl flex items-center justify-center text-black transition-all hover:scale-110 active:scale-95 shadow-xl border border-white/20">
                    <span className="text-2xl">×</span>
                 </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                 {/* Viewer Section */}
                 <div className="flex-[2] bg-black flex items-center justify-center relative min-h-[300px]">
                    {activeMaterial.type === "video" ? (
                      <iframe 
                         src={`https://www.youtube.com/embed/${activeMaterial.content}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0`}
                         className="w-full h-full border-none"
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         allowFullScreen
                      />
                    ) : activeMaterial.type === "pdf" ? (
                      <iframe 
                         src={`${activeMaterial.content}#toolbar=1`}
                         className="w-full h-full border-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-white p-12 overflow-y-auto selection:bg-blue-100 selection:text-blue-900">
                         <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                             <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                                <Type className="w-8 h-8" />
                             </div>
                             <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{activeMaterial.category}</span>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeMaterial.title}</h3>
                             </div>
                         </div>
                         <div className="prose prose-slate max-w-none">
                             <pre className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-slate-700 font-medium">
                                {activeMaterial.content}
                             </pre>
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Sidebar Info Section */}
                 {(activeMaterial.type !== "text") && (
                   <div className="flex-1 p-12 bg-white flex flex-col border-l border-slate-100">
                      <div className="flex-grow">
                         <div className="mb-10">
                            <span className="px-4 py-2 bg-blue-50 border border-blue-100 text-[#0a0aa1] font-black text-[10px] uppercase tracking-widest rounded-2xl inline-block mb-6 shadow-sm">{activeMaterial.category}</span>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-[1.1]">{activeMaterial.title}</h2>
                         </div>

                         <div className="space-y-8">
                            <div>
                               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Detailed Description</h5>
                               <p className="text-lg text-slate-600 leading-relaxed font-medium">{activeMaterial.description || "No specific details provided for this study resource."}</p>
                            </div>
                            
                            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                               <div>
                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Uploaded By</h5>
                                  <p className="text-sm font-bold text-slate-800">{activeMaterial.uploadedBy === "admin" ? "Academy Head Office" : "Authorized Center"}</p>
                               </div>
                               {activeMaterial.type === "pdf" && (
                                  <a 
                                    href={activeMaterial.content} 
                                    download 
                                    target="_blank"
                                    className="w-14 h-14 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                  >
                                    <Download className="w-6 h-6" />
                                  </a>
                               )}
                            </div>
                         </div>
                      </div>

                      <div className="mt-auto">
                         <button 
                            onClick={() => setActiveMaterial(null)}
                            className="w-full py-5 rounded-[28px] border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:border-slate-200 hover:bg-slate-50 transition-all"
                          >
                           Close Viewer
                         </button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
