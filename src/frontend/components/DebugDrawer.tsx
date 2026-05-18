import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useLocation } from "wouter";
import {
  HomePageSkeleton,
  NotePageSkeleton,
  SettingsPageSkeleton,
  TranscriptPageSkeleton,
  ConversationDetailPageSkeleton,
  NotesPageSkeleton,
  FolderPageSkeleton,
  CollectionsPageSkeleton,
  SearchPageSkeleton,
} from "./shared/SkeletonLoader";

const isDev = process.env.NODE_ENV !== "production";

// =============================================================================
// Skeleton override store (subscribed to by useDebugSkeletonOverride)
// =============================================================================

let skeletonOn = false;
const listeners = new Set<() => void>();

function setSkeletonOn(enabled: boolean) {
  skeletonOn = enabled;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return skeletonOn;
}

export function useSkeletonOn() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// =============================================================================
// Route → skeleton mapping
// =============================================================================

interface RouteInfo {
  label: string;
  matches: (path: string) => boolean;
  Skeleton: () => React.ReactNode;
}

const ROUTES: RouteInfo[] = [
  { label: "Home (/)", matches: (p) => p === "/", Skeleton: HomePageSkeleton },
  { label: "Note (/note/:id)", matches: (p) => p.startsWith("/note/"), Skeleton: NotePageSkeleton },
  { label: "Settings (/settings)", matches: (p) => p === "/settings", Skeleton: SettingsPageSkeleton },
  { label: "Transcript (/transcript/:date)", matches: (p) => p.startsWith("/transcript/"), Skeleton: TranscriptPageSkeleton },
  { label: "Conversation (/conversation/:id)", matches: (p) => p.startsWith("/conversation/"), Skeleton: ConversationDetailPageSkeleton },
  { label: "Notes (/notes)", matches: (p) => p === "/notes", Skeleton: NotesPageSkeleton },
  { label: "Folder (/folder/:id)", matches: (p) => p.startsWith("/folder/"), Skeleton: FolderPageSkeleton },
  { label: "Collections (/collections)", matches: (p) => p === "/collections", Skeleton: CollectionsPageSkeleton },
  { label: "Search (/search)", matches: (p) => p === "/search", Skeleton: SearchPageSkeleton },
];

function routeForPath(path: string): RouteInfo | null {
  return ROUTES.find((r) => r.matches(path)) ?? null;
}

/**
 * Wrap router output. When the global skeleton toggle is on and the current
 * route has a known skeleton, render the skeleton instead of children.
 */
export function DebugSkeletonGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const on = useSkeletonOn();
  const route = routeForPath(location);
  if (on && route) {
    const S = route.Skeleton;
    return <S />;
  }
  return <>{children}</>;
}

// =============================================================================
// DebugDrawer
// =============================================================================

type Tab = "info" | "ui";

export function DebugDrawer() {
  if (!isDev) return null;

  const PILL = 48;
  const PANEL_W = 340;
  const PANEL_H = 360;

  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [pillPos, setPillPos] = useState({ x: 24, y: 24 });
  const [panelPos, setPanelPos] = useState({ x: 24, y: 24 });
  const [location] = useLocation();
  const skeleton = useSkeletonOn();
  const currentRoute = routeForPath(location);

  const dragRef = useRef<{
    target: "pill" | "panel";
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;

      const w = drag.target === "pill" ? PILL : PANEL_W;
      const h = drag.target === "pill" ? PILL : PANEL_H;
      const maxX = window.innerWidth - w - 8;
      const maxY = window.innerHeight - h - 8;
      const next = {
        x: Math.max(8, Math.min(maxX, e.clientX - drag.offsetX)),
        y: Math.max(8, Math.min(maxY, e.clientY - drag.offsetY)),
      };
      if (drag.target === "pill") setPillPos(next);
      else setPanelPos(next);
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (drag?.target === "pill" && !drag.moved) setExpanded(true);
      dragRef.current = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current || e.touches.length === 0) return;
      const t = e.touches[0];
      onMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      e.preventDefault();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const beginDrag = (
    target: "pill" | "panel",
    clientX: number,
    clientY: number,
  ) => {
    const pos = target === "pill" ? pillPos : panelPos;
    dragRef.current = {
      target,
      offsetX: clientX - pos.x,
      offsetY: clientY - pos.y,
      startX: clientX,
      startY: clientY,
      moved: false,
    };
  };

  if (expanded) {
    return (
      <div
        style={{
          left: panelPos.x,
          top: panelPos.y,
          width: PANEL_W,
          height: PANEL_H,
        }}
        className="fixed z-9999 flex flex-col bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            beginDrag("panel", e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) beginDrag("panel", t.clientX, t.clientY);
          }}
          style={{ touchAction: "none" }}
          className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white border-b border-zinc-700 cursor-grab active:cursor-grabbing select-none"
        >
          <span className="font-mono text-sm">Debug</span>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={() => setExpanded(false)}
            className="px-3 py-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-sm font-mono"
          >
            close
          </button>
        </div>

        <div className="flex bg-zinc-900 border-b border-zinc-700">
          {(["info", "ui"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-mono uppercase tracking-wide ${
                tab === t
                  ? "text-white border-b-2 border-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-zinc-950 text-zinc-300 p-4 font-mono text-sm">
          {tab === "info" && (
            <div className="space-y-2">
              <div>
                <span className="text-zinc-500">route:</span> {location}
              </div>
              <div>
                <span className="text-zinc-500">matched:</span>{" "}
                {currentRoute?.label ?? "(no match)"}
              </div>
            </div>
          )}

          {tab === "ui" && (
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 px-3 py-3 rounded-md bg-zinc-900 border border-zinc-800">
                <div>
                  <div className="text-zinc-100">Skeleton mode</div>
                  <div className="text-xs text-zinc-500">
                    Renders the skeleton for whichever page is open.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={skeleton}
                  onChange={(e) => setSkeletonOn(e.target.checked)}
                  className="w-5 h-5 accent-white"
                />
              </label>

              <div className="text-xs text-zinc-500 px-1">
                Current page:{" "}
                <span className="text-zinc-300">
                  {currentRoute?.label ?? "(no skeleton mapping)"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        beginDrag("pill", e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) beginDrag("pill", t.clientX, t.clientY);
      }}
      style={{ left: pillPos.x, top: pillPos.y, touchAction: "none" }}
      className="fixed z-9999 w-12 h-12 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center font-mono text-xs select-none cursor-grab active:cursor-grabbing"
    >
      DBG
    </div>
  );
}
