"use client";

import { ArrowUp, Mouse } from "lucide-react";
import { useEffect, useState } from "react";

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > 260);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-5 right-5 z-70 flex h-14 w-10 items-center justify-center rounded-full border-2 border-[#0a0aa1] bg-white text-[#0a0aa1] shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#0a0aa1] hover:text-white sm:bottom-6 sm:right-6 ${
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span className="relative flex h-full w-full items-center justify-center">
        <Mouse className="h-7 w-7" strokeWidth={1.8} />
        <ArrowUp className="absolute top-2 h-4 w-4 animate-bounce" strokeWidth={2.4} />
      </span>
    </button>
  );
}