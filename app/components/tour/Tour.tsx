"use client";

import { useCallback, useRef, useState } from "react";
import type { TourNode } from "@/lib/content";
import PanoramaViewer, { type PanoramaViewerHandle } from "./PanoramaViewer";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      aria-hidden
      className={dir === "left" ? "rotate-180" : ""}
    >
      <path
        d="M1.5 1L6 4.5L1.5 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Tour({
  nodes,
  unitName,
}: {
  nodes: TourNode[];
  unitName?: string;
}) {
  const viewerRef = useRef<PanoramaViewerHandle>(null);
  const [currentId, setCurrentId] = useState(nodes[0]?._id ?? "");
  const [ready, setReady] = useState(false);

  const index = Math.max(0, nodes.findIndex((n) => n._id === currentId));
  const current = nodes[index] ?? nodes[0];
  const total = nodes.length;
  const prev = nodes[(index - 1 + total) % total];
  const next = nodes[(index + 1) % total];

  const goTo = useCallback((id: string) => viewerRef.current?.goTo(id), []);

  return (
    <section id="tour" className="bg-page px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        {/* Header row */}
        <div className="mb-6 flex flex-col gap-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-lagoon">
              {unitName ? `${unitName} · ` : ""}Guided 360° walkthrough
            </p>
            <h2 className="mt-2 max-w-xl text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              {total} stops, in the order you&rsquo;d walk them
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(prev._id)}
              className="flex items-center gap-2.5 rounded-lg border border-hair-strong bg-surface px-4 py-3 text-[13px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep"
            >
              <Chevron dir="left" />
              {prev.name}
            </button>
            <button
              type="button"
              onClick={() => goTo(next._id)}
              className="flex items-center gap-2.5 rounded-lg bg-deep px-4 py-3 text-[13px] font-medium text-white transition-colors hover:bg-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {next.name}
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        {/* Body: viewer + sidebar */}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Viewer column */}
          <div>
            <div className="relative h-[380px] overflow-hidden rounded-xl bg-ink sm:h-[460px] lg:h-[520px]">
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

              {/* Status chips */}
              <div className="pointer-events-none absolute left-4 top-4 z-10 flex gap-2">
                <span className="rounded-md bg-ink/[0.66] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white backdrop-blur">
                  Stop {index + 1} of {total}
                </span>
                <span className="rounded-md bg-ink/[0.66] px-3 py-2 text-[13px] font-medium text-white backdrop-blur">
                  {current.name}
                </span>
              </div>

              {/* Progress bars */}
              <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex gap-1">
                {nodes.map((n, i) => (
                  <span
                    key={n._id}
                    className={`h-[3px] flex-1 rounded-full ${
                      i === index ? "bg-pool" : "bg-white/35"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Caption card */}
            <div className="mt-[18px] flex gap-5 rounded-xl border border-hair bg-surface p-5">
              <span className="font-mono text-xs text-olive">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[17px] font-semibold text-ink">{current.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-copy">
                  {current.caption}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Plan view */}
            <div className="rounded-xl border border-hair bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Plan view
              </p>
              <div className="relative mt-3 h-[170px] overflow-hidden rounded-lg bg-sand">
                {/* Stylised footprint stand-in until the client supplies a floor plan */}
                <div className="absolute inset-5 rounded-md border border-ink/15" />
                <div className="absolute inset-x-5 top-1/2 h-px bg-ink/10" />
                {nodes.map((n) => {
                  const active = n._id === currentId;
                  return (
                    <button
                      key={n._id}
                      type="button"
                      onClick={() => goTo(n._id)}
                      aria-label={`Jump to ${n.name}`}
                      aria-current={active ? "true" : undefined}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all ${
                        active ? "h-[18px] w-[18px] bg-olive" : "h-3 w-3 bg-deep hover:bg-lagoon"
                      }`}
                      style={{ left: `${n.plan[0]}%`, top: `${n.plan[1]}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Stop rail */}
            <ul className="flex flex-col gap-0.5 rounded-xl border border-hair bg-surface p-2">
              {nodes.map((n, i) => {
                const active = n._id === currentId;
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => goTo(n._id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-[11px] text-left transition-colors ${
                        active ? "bg-sand" : "hover:bg-page"
                      }`}
                    >
                      <span
                        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                          active ? "bg-olive text-white" : "bg-sand text-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`text-[13px] font-medium ${
                          active ? "text-ink" : "text-copy"
                        }`}
                      >
                        {n.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
