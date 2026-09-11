"use client";

import { useCallback, useRef, useState } from "react";
import type { TourNode } from "@/lib/content";
import PanoramaViewer, { type PanoramaViewerHandle } from "./PanoramaViewer";

/**
 * Embeddable 360° viewer: the photo-sphere-viewer stage (drag, 3D hotspots,
 * zoom/fullscreen) plus a stop rail. No section chrome — it drops into the
 * reusable MediaViewer panel and the landing Inside band.
 */
export default function Tour({
  nodes,
  tone = "light",
}: {
  nodes: TourNode[];
  /** "dark" restyles the stop rail for an ink background (landing Inside band). */
  tone?: "light" | "dark";
}) {
  const viewerRef = useRef<PanoramaViewerHandle>(null);
  const [currentId, setCurrentId] = useState(nodes[0]?._id ?? "");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const index = Math.max(0, nodes.findIndex((n) => n._id === currentId));
  const current = nodes[index] ?? nodes[0];
  const total = nodes.length;
  const dark = tone === "dark";

  // When WebGL is unavailable the interactive viewer can't start; the rail then
  // drives a flat equirectangular preview instead of an endless loader.
  const goTo = useCallback((id: string) => {
    setCurrentId(id);
    viewerRef.current?.goTo(id);
  }, []);

  return (
    <div>
      <div className={`relative aspect-video overflow-hidden rounded-2xl border bg-ink ${dark ? "border-white/[0.14]" : "border-hair"}`}>
        {failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current?.panorama} alt={current?.name} className="h-full w-full object-cover" />
        ) : (
          <PanoramaViewer
            ref={viewerRef}
            nodes={nodes}
            onNodeChange={setCurrentId}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}

        {failed && (
          <div className="pointer-events-none absolute right-4 top-3.5 z-10 rounded-full bg-ink/60 px-3 py-1.75 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
            Flat view · 360° needs WebGL
          </div>
        )}

        {!ready && !failed && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ink">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-pool"
              role="status"
              aria-label="Loading 360° tour"
            />
          </div>
        )}

        {!failed && (
          <div className="pointer-events-none absolute left-4 top-3.5 z-10 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.75">
            <span className="h-1.75 w-1.75 rounded-full bg-pool" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white">
              360° · drag to look around
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-4 left-4 z-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
            Stop {index + 1} of {total}
          </div>
          <div className="mt-0.5 text-[24px] font-semibold text-white">
            {current?.name}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {nodes.map((n, i) => {
          const active = n._id === currentId;
          const cls = dark
            ? `min-h-11 rounded-[10px] border-[1.5px] px-4 text-[15px] ${
                active
                  ? "border-pool bg-pool font-extrabold text-ink"
                  : "border-white/[0.22] bg-white/5 font-semibold text-white/90 hover:border-white"
              }`
            : `rounded-lg border px-3.75 py-2.5 text-sm font-semibold ${
                active ? "border-deep bg-deep text-white" : "border-hair-strong bg-surface text-copy hover:border-ink"
              }`;
          return (
            <button
              key={n._id}
              type="button"
              onClick={() => goTo(n._id)}
              aria-current={active ? "true" : undefined}
              className={`cursor-pointer transition-colors ${cls}`}
            >
              {i + 1} · {n.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
