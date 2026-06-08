export default function GalleryContent() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          className="rounded-sm border border-slate-500 bg-slate-700 px-4 py-2 text-sm text-white"
        >
          All
        </button>
        <button
          type="button"
          className="rounded-sm border border-slate-500 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Annual Function
        </button>
        <button
          type="button"
          className="rounded-sm border border-slate-500 bg-white px-4 py-2 text-sm text-slate-700"
        >
          gallery
        </button>
      </div>
    </div>
  );
}
