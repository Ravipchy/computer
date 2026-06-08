"use client";

import { useEffect, useMemo, useState } from "react";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function ExamCountdown({ targetAt }: { targetAt: string | Date }) {
  const targetMs = useMemo(() => new Date(targetAt).getTime(), [targetAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (Number.isNaN(targetMs)) return null;
  const remaining = targetMs - now;
  if (remaining <= 0) return <span className="text-xs font-black text-emerald-600">Exam live now</span>;

  return (
    <span className="text-xs font-black text-amber-600">
      Starts in {formatDuration(remaining)}
    </span>
  );
}

