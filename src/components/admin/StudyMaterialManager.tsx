"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle, Trash2, FileText, Type, Play, FileIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
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

interface Props {
  role: "admin" | "atc";
}

export default function StudyMaterialManager({ role }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const { loading: authLoading, user: authUser } = useAuth();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    type: "video" as "video" | "pdf" | "text",
    content: ""
  });

  const fetchMaterials = useCallback(async () => {
    if (authLoading || !authUser) return;
    try {
      const res = await apiFetch(`/api/${role}/study-material`);
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : (data && Array.isArray(data.materials) ? data.materials : []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [role, authLoading, authUser]);

  useEffect(() => {
    if (authLoading || !authUser) return;
    void fetchMaterials();
  }, [fetchMaterials, authLoading, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/${role}/study-material`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAdding(false);
        setFormData({ title: "", description: "", category: "", type: "video", content: "" });
        await fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      const res = await apiFetch(`/api/${role}/study-material`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await fetchMaterials();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedMaterials.length} materials?`)) return;
    setLoading(true);
    try {
      for (const id of selectedMaterials) {
        await apiFetch(`/api/${role}/study-material`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      setSelectedMaterials([]);
      await fetchMaterials();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Study Materials</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage videos, PDFs, and notes for students</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          <PlusCircle className="w-5 h-5" /> Add Material
        </button>
      </div>

      {selectedMaterials.length > 0 && (
         <div className="bg-slate-900 px-6 py-3 rounded-2xl flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-4 text-white text-xs font-bold">
               <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">{selectedMaterials.length}</div>
               <span className="uppercase tracking-widest">Resources Selected</span>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={handleBulkDelete} className="px-5 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition shadow-lg shadow-red-500/20">Delete All</button>
               <button onClick={() => setSelectedMaterials([])} className="px-5 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition">Cancel</button>
            </div>
         </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-[#0a0aa1] p-6 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Add New Study Material</h3>
              <button onClick={() => setIsAdding(false)} className="text-white/60 hover:text-white transition text-sm">Close</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Category / Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DCA, PGDCA, MS Office"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Material Type</label>
                  <div className="flex gap-2">
                    {[
                      { id: "video", icon: Play, label: "Video" },
                      { id: "pdf", icon: FileIcon, label: "PDF" },
                      { id: "text", icon: Type, label: "Notes" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t.id as "video" | "pdf" | "text", content: "" })}
                        className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${formData.type === t.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"}`}
                      >
                        <t.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Enter a descriptive title"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                  {formData.type === "video" ? "YouTube Link" : formData.type === "pdf" ? "Upload PDF Document" : "Notes / Content"}
                </label>
                {formData.type === "text" ? (
                  <textarea
                    rows={6}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    placeholder="Enter your notes here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                ) : formData.type === "pdf" ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".pdf"
                      required={!formData.content}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) { // 10MB limit
                            alert("File is too large. Max 10MB allowed.");
                            e.target.value = "";
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, content: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {formData.content && (
                      <p className="text-[10px] text-emerald-600 font-bold px-2">✓ PDF Loaded successfully</p>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Paste YouTube Link or Video ID"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: extractYoutubeId(e.target.value) })}
                  />
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#0a0aa1] text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-4">
          <SkeletonLoader type="card" count={3} />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-300">
                <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Materials Uploaded</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Start by uploading some videos, PDFs or notes for your students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(materials) && materials.map((m) => (
            <div key={m._id} className={`group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 overflow-hidden flex flex-col relative ${selectedMaterials.includes(m._id) ? 'border-blue-600 bg-blue-50/10' : ''}`}>
              <div className="absolute top-4 left-4 z-10">
                 <input 
                   type="checkbox" 
                   className="w-5 h-5 rounded-lg border-white/50 text-blue-600 focus:ring-blue-500 bg-black/20 backdrop-blur-sm cursor-pointer shadow-sm"
                   checked={selectedMaterials.includes(m._id)}
                   onChange={(e) => {
                     if (e.target.checked) setSelectedMaterials(prev => [...prev, m._id]);
                     else setSelectedMaterials(prev => prev.filter(id => id !== m._id));
                   }}
                 />
              </div>
              <div className="p-1">
                <div className="aspect-video bg-slate-100 rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  {m.type === "video" ? (
                    <div className="relative w-full h-full">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src={`https://img.youtube.com/vi/${m.content}/mqdefault.jpg`} className="w-full h-full object-cover" alt="" />
                       <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                           <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center group-hover:scale-110 transition duration-300">
                               <Play className="w-6 h-6 fill-current" />
                           </div>
                       </div>
                    </div>
                  ) : m.type === "pdf" ? (
                    <FileText className="w-12 h-12 text-blue-600" />
                  ) : (
                    <Type className="w-12 h-12 text-emerald-600" />
                  )}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                    {m.category}
                  </div>
                </div>
              </div>
              
              <div className="p-6 grow">
                <h4 className="font-bold text-slate-800 text-lg leading-tight mb-2 line-clamp-1">{m.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">{m.description || "No description provided."}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${m.type === "video" ? "bg-red-500" : m.type === "pdf" ? "bg-blue-500" : "bg-emerald-500"}`} />
                       <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">{m.type}</span>
                   </div>
                   <button 
                     onClick={() => handleDelete(m._id)}
                     className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition duration-300"
                    >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
