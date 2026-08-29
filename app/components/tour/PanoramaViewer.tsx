"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
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

// ── Data transform: content TourNode → virtual-tour node ─────────────────────
function toViewerNodes(nodes: TourNode[]) {
  return nodes.map((node) => ({
    id: node._id,
    panorama: node.panorama,
    name: node.name,
    caption: node.name,
    links: node.links.map((link) => ({
      nodeId: link.to,
      position: { yaw: link.yaw, pitch: "0deg" },
    })),
  }));
}

export interface PanoramaViewerHandle {
  goTo: (nodeId: string) => void;
}

interface Props {
  nodes: TourNode[];
  onNodeChange?: (nodeId: string) => void;
  onReady?: () => void;
}

/**
 * Multi-stop 360° viewer built on photo-sphere-viewer's virtual-tour plugin,
 * which provides the drag-to-look camera, the 3D arrow hotspots that fade in as
 * you look toward them, touch + fullscreen, and on-demand rendering. The React
 * chrome (rail, plan, caption, prev/next) lives in Tour.tsx and drives this via
 * the imperative `goTo` handle.
 */
const PanoramaViewer = forwardRef<PanoramaViewerHandle, Props>(function PanoramaViewer(
  { nodes, onNodeChange, onReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerType | null>(null);

  useImperativeHandle(ref, () => ({
    goTo(nodeId: string) {
      const tour =
        viewerRef.current?.getPlugin<VirtualTourPluginType>("virtual-tour");
      tour?.setCurrentNode(nodeId);
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    let destroyed = false;

    loadPsv().then(({ Viewer, VirtualTourPlugin }) => {
      if (destroyed || !containerRef.current) return;

      const psvNodes = toViewerNodes(nodes);

      const viewer = new Viewer({
        container: containerRef.current,
        navbar: ["zoom", "fullscreen"],
        defaultZoomLvl: 20,
        touchmoveTwoFingers: true,
        mousewheelCtrlKey: false,
        loadingImg: undefined,
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
      tour.addEventListener("node-changed", (e) => {
        const id = (e as unknown as { node: { id: string } }).node?.id;
        if (id) onNodeChange?.(id);
      });
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
});

export default PanoramaViewer;
