"use client";

import { useCallback, useRef, useState } from "react";
import type { TourNode } from "@/lib/content";
import PanoramaViewer, { type PanoramaViewerHandle } from "./PanoramaViewer";

/**
 * Embeddable 360° viewer: the photo-sphere-viewer stage (drag, 3D hotspots,
 * zoom/fullscreen) plus a stop rail. No section chrome — it drops into the
 * reusable MediaViewer panel.
 */
export default function Tour({ nodes }: { nodes: TourNode[] }) {
  const viewerRef = useRef<PanoramaViewerHandle>(null);
  const [currentId, setCurrentId] = useState(nodes[0]?._id ?? "");
  const [ready, setReady] = useState(false);

  const index = Math.max(0, nodes.findIndex((n) => n._id === currentId));
  const current = nodes[index] ?? nodes[0];
  const total = nodes.length;

  const goTo = useCallback((id: string) => viewerRef.current?.goTo(id), []);

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-hair bg-ink">
        <PanoramaViewer
          ref={viewerRef}
          nodes={nodes}
          onNodeChange={setCurrentId}
          onReady={() => setReady(true)}
        />

        {!ready && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ink">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-pool"
              role="status"
              aria-label="Loading 360° tour"
            />
          </div>
        )}

        <div className="pointer-events-none absolute left-4 top-3.5 z-10 flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.75">
          <span className="h-1.75 w-1.75 rounded-full bg-pool" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white">
            360° · drag to look around
          </span>
        </div>

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
          return (
            <button
              key={n._id}
              type="button"
              onClick={() => goTo(n._id)}
              aria-current={active ? "true" : undefined}
              className={`cursor-pointer rounded-lg border px-3.75 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-deep bg-deep text-white"
                  : "border-hair-strong bg-surface text-copy hover:border-ink"
              }`}
            >
              {i + 1} · {n.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
