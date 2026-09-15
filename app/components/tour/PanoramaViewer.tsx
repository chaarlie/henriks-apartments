"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Viewer as ViewerType } from "@photo-sphere-viewer/core";
import type { VirtualTourPlugin as VirtualTourPluginType } from "@photo-sphere-viewer/virtual-tour-plugin";
import type { TourNode } from "@/lib/content";

// ── Lazy loader (singleton) ──────────────────────────────────────────────────
type PsvModules = {
  Viewer: typeof import("@photo-sphere-viewer/core").Viewer;
  VirtualTourPlugin: typeof import("@photo-sphere-viewer/virtual-tour-plugin").VirtualTourPlugin;
};

let psvPromise: Promise<PsvModules> | null = null;

function loadPsv(): Promise<PsvModules> {
  if (!psvPromise) {
    psvPromise = Promise.all([
      import("@photo-sphere-viewer/core"),
      import("@photo-sphere-viewer/virtual-tour-plugin"),
      import("@photo-sphere-viewer/core/index.css"),
      import("@photo-sphere-viewer/virtual-tour-plugin/index.css"),
    ]).then(([core, tour]) => ({
      Viewer: core.Viewer,
      VirtualTourPlugin: tour.VirtualTourPlugin,
    }));
  }
  return psvPromise;
}

/**
 * Orientation used by a stop that sets none of its own. These are NUMBERS, which
 * photo-sphere-viewer reads as radians (pan 30 rad ≈ 279°) — almost certainly not
 * what "30" was meant to say, but kept exactly as-is so existing tours keep the
 * framing they were tuned against. Per-stop values from /admin are degree strings
 * ("30deg") and override this.
 */
const DEFAULT_SPHERE_CORRECTION = { pan: 30, tilt: 0 };

// ── Data transform: content TourNode → virtual-tour node ─────────────────────
function toViewerNodes(nodes: TourNode[]) {
  /*
    A hotspot pointing at a stop that isn't in this tour makes the virtual-tour
    plugin throw from inside the Viewer constructor, which takes every stop down
    to the flat fallback — one mistyped Stop ID in /admin used to cost the whole
    tour. Drop the dead links instead, so the cost is the single arrow that had
    nowhere to lead. Self-links throw the same way, and go the same way.
  */
  const known = new Set(nodes.map((n) => n._id));
  const usable = (node: TourNode, to: string) => known.has(to) && to !== node._id;

  return nodes.map((node) => {
    const dead = node.links.filter((link) => !usable(node, link.to));
    if (dead.length > 0) {
      console.warn(
        `360° tour: stop "${node._id}" links to ${dead
          .map((l) => `"${l.to}"`)
          .join(", ")}, which is not a stop in this tour — hotspot dropped.`,
      );
    }

    return {
      id: node._id,
      panorama: node.panorama,
      name: node.name,
      caption: node.name,
      // Set one on every node rather than leaning on the viewer-level default, so
      // each stop's framing is explicit and independent of the stop before it.
      sphereCorrection: node.sphereCorrection ?? DEFAULT_SPHERE_CORRECTION,
      links: node.links
        .filter((link) => usable(node, link.to))
        .map((link) => ({
          nodeId: link.to,
          position: { yaw: link.yaw, pitch: "0deg" },
        })),
    };
  });
}

export interface PanoramaViewerHandle {
  goTo: (nodeId: string) => void;
}

interface Props {
  nodes: TourNode[];
  onNodeChange?: (nodeId: string) => void;
  onReady?: () => void;
  /** Fired when the viewer can't start (e.g. WebGL unavailable) so the caller
   *  can show a flat fallback instead of an endless loader. */
  onError?: () => void;
}

/**
 * Multi-stop 360° viewer built on photo-sphere-viewer's virtual-tour plugin,
 * which provides the drag-to-look camera, the 3D arrow hotspots that fade in as
 * you look toward them, touch + fullscreen, and on-demand rendering. The React
 * chrome (rail, plan, caption, prev/next) lives in Tour.tsx and drives this via
 * the imperative `goTo` handle.
 */
const PanoramaViewer = forwardRef<PanoramaViewerHandle, Props>(
  function PanoramaViewer({ nodes, onNodeChange, onReady, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<ViewerType | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        goTo(nodeId: string) {
          const tour =
            viewerRef.current?.getPlugin<VirtualTourPluginType>("virtual-tour");
          tour?.setCurrentNode(nodeId);
        },
      }),
      [],
    );

    useEffect(() => {
      if (!containerRef.current || nodes.length === 0) return;
      let destroyed = false;

      loadPsv()
        .then(({ Viewer, VirtualTourPlugin }) => {
          if (destroyed || !containerRef.current) return;

          const psvNodes = toViewerNodes(nodes);

          // Viewer construction throws on environments without WebGL2; catch it so
          // it surfaces as a graceful fallback rather than an unhandled rejection.
          const viewer = new Viewer({
            container: containerRef.current,
            navbar: ["zoom", "fullscreen"],
            defaultZoomLvl: 20,
            touchmoveTwoFingers: true,
            mousewheelCtrlKey: false,
            loadingImg: undefined,
            sphereCorrection: DEFAULT_SPHERE_CORRECTION,
            plugins: [
              [
                VirtualTourPlugin,
                {
                  nodes: psvNodes,
                  startNodeId: psvNodes[0].id,
                  positionMode: "manual",
                  renderMode: "3d",
                  preload: true,
                  transitionOptions: { showLoader: false, speed: "12rpm" },
                },
              ],
            ],
          });

          viewerRef.current = viewer;
          viewer.addEventListener("ready", () => onReady?.(), { once: true });

          const tour =
            viewer.getPlugin<VirtualTourPluginType>(VirtualTourPlugin);
          tour?.addEventListener("node-changed", (e) => {
            const id = (e as unknown as { node: { id: string } }).node?.id;
            if (id) onNodeChange?.(id);
          });
        })
        .catch((err) => {
          if (destroyed) return;
          console.warn(
            "360° viewer unavailable — falling back to flat view:",
            err,
          );
          onError?.();
        });

      return () => {
        destroyed = true;
        viewerRef.current?.destroy();
        viewerRef.current = null;
      };
      // nodes is static content; intentionally run once on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-none [&_.psv-container]:bg-ink"
        aria-label="Drag to look around the 360° panorama"
      />
    );
  },
);

export default PanoramaViewer;
