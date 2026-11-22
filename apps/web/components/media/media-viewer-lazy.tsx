"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2 } from "lucide-react";
import { RemoteImage } from "@/components/ui/remote-image";
import { cn } from "@/lib/utils";
import type { MediaViewerSurface } from "@/components/media/media-viewer-config";
import type { MediaViewerItem } from "@/components/media/media-viewer-types";

export type { MediaViewerItem };

type MediaViewerProps = {
  items: MediaViewerItem[];
  initialIndex?: number;
  triggerLabel?: string;
  triggerClassName?: string;
  thumbnailClassName?: string;
  mode?: "gallery" | "button" | "attachment";
  surface?: MediaViewerSurface;
};

const MediaViewerInner = dynamic(
  () => import("@/components/media/media-viewer").then((mod) => mod.MediaViewer),
  { ssr: false }
);

function GalleryTrigger({
  items,
  initialIndex = 0,
  triggerLabel = "Open media viewer",
  triggerClassName,
  thumbnailClassName,
  onOpen
}: MediaViewerProps & { onOpen: () => void }) {
  const item = items[initialIndex];
  if (!item) return null;
  const prioritize = initialIndex === 0;
  return (
    <button
      type="button"
      className={cn("group relative block h-full w-full overflow-hidden", triggerClassName)}
      onClick={onOpen}
      aria-label={`${triggerLabel}: ${item.title}`}
    >
      {item.type === "image" ? (
        <RemoteImage
          src={item.src}
          alt={item.alt ?? item.title}
          loading={prioritize ? "eager" : "lazy"}
          fetchPriority={prioritize ? "high" : "auto"}
          className={cn("h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]", thumbnailClassName)}
        />
      ) : (
        <span className={cn("flex h-full w-full items-center justify-center bg-secondary text-muted-foreground", thumbnailClassName)} />
      )}
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        View
      </span>
    </button>
  );
}

export function MediaViewer(props: MediaViewerProps) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return <GalleryTrigger {...props} onOpen={() => setOpen(true)} />;
  }
  return <MediaViewerInner {...props} startOpen />;
}
