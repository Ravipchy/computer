"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  src: string;
  /** Fires once when the bitmap is decoded (or on error / timeout fallback). */
  onPainted?: () => void;
};

const READY_TIMEOUT_MS = 12_000;

/**
 * Full-bleed template image behind certificate/marksheet text.
 * Preloads HTTP(S) URLs and hints the browser to fetch/decode ASAP.
 * Parents should hide the text overlay until `onPainted` has run (when a template exists).
 */
export default function DocumentTemplateBackground({ src, onPainted }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const doneRef = useRef(false);

  const fire = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onPainted?.();
  }, [onPainted]);

  useEffect(() => {
    doneRef.current = false;
  }, [src]);

  useEffect(() => {
    const t = window.setTimeout(fire, READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [src, fire]);

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) fire();
  }, [src, fire]);

  useEffect(() => {
    if (!src.startsWith("http://") && !src.startsWith("https://")) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [src]);

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      fetchPriority="high"
      loading="eager"
      decoding="sync"
      onLoad={fire}
      onError={fire}
      className="document-template-bg absolute inset-0 z-[1] h-full w-full bg-white object-fill print:hidden"
    />
  );
}
