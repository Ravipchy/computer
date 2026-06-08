/**
 * Helpers for capturing an A4 (or A4-landscape) overlay element to JPEG and
 * embedding it in a single-page jsPDF document (smaller than PNG for typical templates).
 *
 * The earlier inline implementation (`toPng(el, { pixelRatio: 2 })`) clipped
 * the right-hand side of the certificate on viewports narrower than 297 mm
 * because it relied on the element's bounding rect at the moment of capture,
 * and did not wait for late-loading images (photo, QR, background).
 *
 * This helper:
 *   1. Waits for every <img> inside the element to finish loading.
 *   2. Waits for document.fonts, extra animation frames, and a short delay so
 *      layout/fonts settle (production CDNs can be slower than localhost).
 *   3. Passes explicit width / height / canvasWidth / canvasHeight to
 *      html-to-image so the full A4 area is rasterised even when the element
 *      overflows the viewport.
 */

export type A4Orientation = "portrait" | "landscape";

const ORIENTATION_TO_MM: Record<A4Orientation, { width: number; height: number }> = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
};

async function waitForImages(el: HTMLElement, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
          window.setTimeout(finish, timeoutMs);
        }),
    ),
  );
  // Let the browser flush any pending paint after images decoded.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Extra settle time for production: `html-to-image` clones the DOM into an SVG
 * foreignObject; webfonts and Tailwind must finish before capture or text can
 * rasterize blank (localhost often wins due to cache / faster `_next` static).
 */
async function waitForFontsAndPaintSettle(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 350));
}

function capturePixelSize(el: HTMLElement): { w: number; h: number } {
  const rect = el.getBoundingClientRect();
  const w = Math.ceil(rect.width) || el.offsetWidth || el.clientWidth;
  const h = Math.ceil(rect.height) || el.offsetHeight || el.clientHeight;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

function buildExportClone(el: HTMLElement, w: number, h: number): HTMLElement {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "-100000px";
  clone.style.top = "0";
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.overflow = "hidden";
  clone.style.background = "#ffffff";
  clone.style.isolation = "isolate";
  clone.setAttribute("data-export-clone", "true");

  // Force deterministic layer order for PDF export:
  // background image at bottom, all text/signature overlays above it.
  clone.querySelectorAll<HTMLElement>("img").forEach((img) => {
    if (img.classList.contains("document-template-bg")) {
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.zIndex = "1";
    }
  });
  clone.querySelectorAll<HTMLElement>(".document-overlay-print-root").forEach((overlay) => {
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "80";
    overlay.style.isolation = "isolate";
  });

  document.body.appendChild(clone);
  return clone;
}

/** Render `el` (sized to A4 in CSS units) to a single-page PDF and trigger a download. */
export async function downloadElementAsA4Pdf(
  el: HTMLElement,
  fileName: string,
  orientation: A4Orientation = "portrait",
  /** Lower values → smaller PDF; default keeps text sharp on A4 without multi‑MB PNGs. */
  pixelRatio = 1.35,
  jpegQuality = 0.88,
): Promise<void> {
  await waitForImages(el);
  await waitForFontsAndPaintSettle();

  const [{ toPng }, { default: jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const { w, h } = capturePixelSize(el);
  const cw = Math.max(1, Math.round(w * Math.max(1.6, pixelRatio)));
  const ch = Math.max(1, Math.round(h * Math.max(1.6, pixelRatio)));

  const captureVisibleWithToPng = async (): Promise<string> =>
    toPng(el, {
      cacheBust: true,
      pixelRatio: Math.max(1.6, pixelRatio),
      width: w,
      height: h,
      canvasWidth: cw,
      canvasHeight: ch,
      backgroundColor: "#ffffff",
      skipFonts: true,
      style: {
        transform: "none",
        margin: "0",
      },
    });

  const captureWithCloneFallback = async (): Promise<string> => {
    const { toJpeg } = await import("html-to-image");
    const exportEl = buildExportClone(el, w, h);
    await waitForImages(exportEl);
    await waitForFontsAndPaintSettle();
    try {
      return await toJpeg(exportEl, {
        cacheBust: true,
        pixelRatio,
        quality: jpegQuality,
        width: w,
        height: h,
        canvasWidth: cw,
        canvasHeight: ch,
        backgroundColor: "#ffffff",
        // Avoid broken / cross-origin @font-face inlining on some hosts; overlay
        // text uses explicit system font stacks so capture stays readable.
        skipFonts: true,
        style: {
          transform: "none",
          margin: "0",
        },
      });
    } finally {
      exportEl.remove();
    }
  };

  let jpeg: string;
  try {
    // Primary path: exact visible DOM capture (WYSIWYG).
    jpeg = await captureVisibleWithToPng();
  } catch {
    // Fallback path if visible-DOM capture fails.
    jpeg = await captureWithCloneFallback();
  }

  const dims = ORIENTATION_TO_MM[orientation];
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const fmt = jpeg.startsWith("data:image/png") ? "PNG" : "JPEG";
  pdf.addImage(jpeg, fmt, 0, 0, dims.width, dims.height);
  const safeName = fileName.trim() || "document";
  pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}
