"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, ImageIcon, Maximize2, Pause, Play, ShieldCheck, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { getMediaViewerSurfaceConfig, type MediaViewerSurface } from "@/components/media/media-viewer-config";
import { cn } from "@/lib/utils";

export type MediaViewerItem = {
  id: string;
  src: string;
  type: "image" | "video" | "document" | "unknown";
  title: string;
  alt?: string;
  contentType?: string | null;
  byteSize?: number | null;
  poster?: string | null;
  createdAt?: string | null;
};

type MediaViewerProps = {
  items: MediaViewerItem[];
  initialIndex?: number;
  triggerLabel?: string;
  triggerClassName?: string;
  thumbnailClassName?: string;
  mode?: "gallery" | "button" | "attachment";
  surface?: MediaViewerSurface;
};

function formatBytes(value?: number | null) {
  if (!value) return "Size unknown";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaTypeIcon({ type, className }: { type: MediaViewerItem["type"]; className?: string }) {
  if (type === "image") return <ImageIcon className={className} aria-hidden="true" />;
  if (type === "video") return <Video className={className} aria-hidden="true" />;
  return <FileText className={className} aria-hidden="true" />;
}

function inferType(contentType?: string | null, src?: string | null): MediaViewerItem["type"] {
  const lowerType = contentType?.toLowerCase() ?? "";
  const lowerSrc = src?.toLowerCase() ?? "";
  if (lowerType.startsWith("image/") || /\.(png|jpe?g|webp|gif|avif)$/.test(lowerSrc)) return "image";
  if (lowerType.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(lowerSrc)) return "video";
  if (lowerType.includes("pdf") || /\.(pdf|txt|docx?)$/.test(lowerSrc)) return "document";
  return "unknown";
}

export function createMediaViewerItem(input: Omit<MediaViewerItem, "type"> & { type?: MediaViewerItem["type"] }) {
  return {
    ...input,
    type: input.type ?? inferType(input.contentType, input.src)
  };
}

function canPreviewItem(item: MediaViewerItem, config: ReturnType<typeof getMediaViewerSurfaceConfig>) {
  const withinSizeLimit = !item.byteSize || item.byteSize <= config.maxPreviewBytes;
  return withinSizeLimit && config.allowedTypes.includes(item.type);
}

export function MediaViewer({ items, initialIndex = 0, triggerLabel = "Open media viewer", triggerClassName, thumbnailClassName, mode = "button", surface = "listingGallery" }: MediaViewerProps) {
  const surfaceConfig = getMediaViewerSurfaceConfig(surface);
  const availableItems = useMemo(() => items.filter((item) => item.src), [items]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.min(initialIndex, Math.max(availableItems.length - 1, 0)));
  const [isPlaying, setIsPlaying] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeItem = availableItems[activeIndex];
  const activeItemCanPreview = activeItem ? canPreviewItem(activeItem, surfaceConfig) : false;

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowRight") setActiveIndex((current) => Math.min(current + 1, availableItems.length - 1));
      if (event.key === "ArrowLeft") setActiveIndex((current) => Math.max(current - 1, 0));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [availableItems.length, isOpen]);

  useEffect(() => {
    videoRef.current?.pause();
  }, [activeIndex]);

  if (!availableItems.length) return null;

  function openAt(index: number) {
    setIsPlaying(false);
    setActiveIndex(index);
    setIsOpen(true);
  }

  function next() {
    setIsPlaying(false);
    setActiveIndex((current) => Math.min(current + 1, availableItems.length - 1));
  }

  function previous() {
    setIsPlaying(false);
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function toggleVideo() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }

  const triggerType = availableItems[initialIndex]?.type ?? "unknown";
  const thumbnailPriority = surfaceConfig.primaryImagePriority && initialIndex === 0;

  return (
    <>
      {mode === "gallery" ? (
        <button type="button" className={cn("group relative block h-full w-full overflow-hidden", triggerClassName)} onClick={() => openAt(initialIndex)} aria-label={`${triggerLabel}: ${availableItems[initialIndex]?.title}`}>
          {availableItems[initialIndex]?.type === "image" ? (
            <RemoteImage src={availableItems[initialIndex].src} alt={availableItems[initialIndex].alt ?? availableItems[initialIndex].title} loading={thumbnailPriority ? "eager" : "lazy"} fetchPriority={thumbnailPriority ? "high" : "auto"} className={cn("h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]", thumbnailClassName)} />
          ) : (
            <span className={cn("flex h-full w-full items-center justify-center bg-secondary text-muted-foreground", thumbnailClassName)}>
              <MediaTypeIcon type={triggerType} className="h-8 w-8" />
            </span>
          )}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-bold text-foreground backdrop-blur">
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            View
          </span>
        </button>
      ) : (
        <Button type="button" variant={mode === "attachment" ? "surface" : "outline"} size={mode === "attachment" ? "sm" : "default"} className={triggerClassName} onClick={() => openAt(initialIndex)}>
          <MediaTypeIcon type={triggerType} className="h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      {isOpen && activeItem ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/95 text-white" role="dialog" aria-modal="true" aria-label="Media viewer">
          <div className="flex h-full flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white">{activeItem.type}</Badge>
                  <Badge className="border-emerald-300/30 bg-emerald-300/10 text-emerald-200"><ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{surfaceConfig.proofBadgeLabel}</Badge>
                </div>
                <h2 className="mt-2 truncate text-lg font-black">{activeItem.title}</h2>
                <p className="mt-1 text-xs text-slate-300">{activeItem.contentType ?? "Unknown type"} · {formatBytes(activeItem.byteSize)}</p>
              </div>
              <Button ref={closeButtonRef} type="button" variant="surface" size="icon" onClick={() => setIsOpen(false)} aria-label="Close media viewer">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </header>

            <main className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className="relative flex min-h-0 items-center justify-center p-4">
                {activeItem.type === "image" && activeItemCanPreview ? (
                  <RemoteImage src={activeItem.src} alt={activeItem.alt ?? activeItem.title} loading="eager" fetchPriority="high" className="max-h-full max-w-full rounded-2xl object-contain" />
                ) : activeItem.type === "video" && activeItemCanPreview ? (
                  <div className="relative w-full max-w-5xl">
                    <video ref={videoRef} src={activeItem.src} poster={activeItem.poster ?? undefined} controls preload={surfaceConfig.videoPreload} playsInline className="max-h-[70vh] w-full rounded-2xl bg-black" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                    <Button type="button" variant="surface" className="absolute bottom-4 left-4" onClick={toggleVideo}>
                      {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid max-w-md gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-emerald-200" aria-hidden="true" />
                    <p className="font-bold">{surfaceConfig.unavailablePreviewTitle}</p>
                    <p className="text-sm text-slate-300">{surfaceConfig.unavailablePreviewDescription}</p>
                  </div>
                )}

                <Button type="button" variant="surface" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={previous} disabled={activeIndex === 0} aria-label="Previous media">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
                <Button type="button" variant="surface" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2" onClick={next} disabled={activeIndex === availableItems.length - 1} aria-label="Next media">
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </section>

              <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-white/[0.03] p-4 lg:border-l lg:border-t-0">
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{surfaceConfig.viewerNotesTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{surfaceConfig.viewerNotes}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="surface" className="flex-1">
                      <a href={activeItem.src} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Open
                      </a>
                    </Button>
                    {surfaceConfig.allowDownload ? (
                      <Button asChild variant="surface" className="flex-1">
                        <a href={activeItem.src} download>
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Download
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    {availableItems.map((item, index) => {
                      return (
                        <button type="button" key={item.id} className={cn("flex items-center gap-3 rounded-2xl border border-white/10 p-3 text-left text-sm transition hover:bg-white/10", index === activeIndex && "bg-white/10")} onClick={() => setActiveIndex(index)} aria-current={index === activeIndex ? "true" : undefined}>
                          <MediaTypeIcon type={item.type} className="h-4 w-4 shrink-0 text-emerald-200" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{item.title}</span>
                            <span className="block truncate text-xs text-slate-400">{item.contentType ?? item.type}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            </main>
          </div>
        </div>
      ) : null}
    </>
  );
}
