import React from "react";

interface SkeletonProps {
  type: "card" | "text" | "avatar" | "chart" | "dashboard";
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ type, count = 1, className = "" }: SkeletonProps) {
  const renderItem = () => {
    switch (type) {
      case "dashboard":
        return (
          <div className={`space-y-6 animate-pulse ${className}`}>
             <div className="flex justify-between items-center">
               <div className="h-8 bg-slate-200 rounded-xl w-48"></div>
               <div className="h-8 bg-slate-200 rounded-xl w-64"></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="bg-slate-100 rounded-[2rem] p-6 h-36">
                   <div className="w-12 h-12 bg-slate-200 rounded-2xl mb-4"></div>
                   <div className="h-4 bg-slate-200 rounded-lg w-1/2 mb-3"></div>
                   <div className="h-8 bg-slate-200 rounded-xl w-3/4"></div>
                 </div>
               ))}
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-slate-100 rounded-[2.5rem] h-80 p-8">
                 <div className="flex justify-between">
                   <div>
                     <div className="h-6 bg-slate-200 rounded-lg w-32 mb-2"></div>
                     <div className="h-3 bg-slate-200 rounded-lg w-48"></div>
                   </div>
                   <div className="w-10 h-10 bg-slate-200 rounded-2xl"></div>
                 </div>
               </div>
               <div className="bg-slate-100 rounded-[2.5rem] h-80 p-8">
                 <div className="flex justify-between">
                   <div>
                     <div className="h-6 bg-slate-200 rounded-lg w-32 mb-2"></div>
                     <div className="h-3 bg-slate-200 rounded-lg w-48"></div>
                   </div>
                   <div className="w-10 h-10 bg-slate-200 rounded-2xl"></div>
                 </div>
               </div>
             </div>
          </div>
        );
      case "card":
        return (
          <div className={`bg-slate-100 rounded-2xl p-6 w-full animate-pulse ${className}`}>
            <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-slate-200 rounded w-full mt-auto"></div>
          </div>
        );
      case "text":
        return (
          <div className={`space-y-3 w-full animate-pulse ${className}`}>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        );
      case "avatar":
        return (
          <div className={`flex items-center gap-4 animate-pulse ${className}`}>
            <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0"></div>
            <div className="space-y-2 w-full">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
            </div>
          </div>
        );
      case "chart":
        return (
          <div className={`bg-slate-100 rounded-[2rem] w-full p-6 animate-pulse ${className}`}>
            <div className="flex justify-between mb-8">
              <div className="space-y-2">
                <div className="h-6 bg-slate-200 rounded w-32"></div>
                <div className="h-3 bg-slate-200 rounded w-48"></div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-200"></div>
            </div>
            <div className="h-48 bg-slate-200/50 rounded-xl w-full"></div>
          </div>
        );
      default:
        return null;
    }
  };

  if (count === 1) return renderItem();

  return (
    <div className={`grid gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{renderItem()}</React.Fragment>
      ))}
    </div>
  );
}
