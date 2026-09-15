"use client";

import { useUi } from "@/lib/i18n/client";

import { useEffect } from "react";

export default function VideoModal({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const t = useUi();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/[0.86] p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.walkthroughVideo}
    >
      <div className="w-full max-w-[1000px]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeVideo}
          className="mb-3 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/[0.14] text-base text-white hover:bg-white/[0.26]"
        >
          ✕
        </button>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={t.walkthrough}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
