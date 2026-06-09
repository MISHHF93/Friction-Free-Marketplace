import type { MediaViewerItem } from "@/components/media/media-viewer";

export type MediaViewerSurface = "listingGallery" | "messageAttachment";

export type MediaViewerSurfaceConfig = {
  surface: MediaViewerSurface;
  proofBadgeLabel: string;
  viewerNotesTitle: string;
  viewerNotes: string;
  unavailablePreviewTitle: string;
  unavailablePreviewDescription: string;
  allowedTypes: MediaViewerItem["type"][];
  maxPreviewBytes: number;
  allowDownload: boolean;
  videoPreload: "none" | "metadata" | "auto";
  primaryImagePriority: boolean;
};

export const mediaViewerSurfaceConfigs: Record<MediaViewerSurface, MediaViewerSurfaceConfig> = {
  listingGallery: {
    surface: "listingGallery",
    proofBadgeLabel: "Review proof before purchase",
    viewerNotesTitle: "Listing media review",
    viewerNotes:
      "Compare media against the title, price, seller history, condition notes, serial numbers, receipts, and proof of ownership. Be cautious when photos or videos conflict with the listing details.",
    unavailablePreviewTitle: "Preview is not available for this listing media.",
    unavailablePreviewDescription: "Ask the seller for a supported image or video, close-ups, receipts, and current timestamps before making an offer.",
    allowedTypes: ["image", "video"],
    maxPreviewBytes: 250 * 1024 * 1024,
    allowDownload: false,
    videoPreload: "metadata",
    primaryImagePriority: true
  },
  messageAttachment: {
    surface: "messageAttachment",
    proofBadgeLabel: "Keep proof in-app",
    viewerNotesTitle: "Attachment safety",
    viewerNotes:
      "Review attachments for condition, timestamps, packaging, proof of ownership, unsafe pickup instructions, and off-platform payment pressure. Keep important deal evidence in the marketplace thread.",
    unavailablePreviewTitle: "Preview is not available for this file type.",
    unavailablePreviewDescription: "Open or download the attachment only if you trust the sender and the file matches the conversation context.",
    allowedTypes: ["image", "video", "document", "unknown"],
    maxPreviewBytes: 100 * 1024 * 1024,
    allowDownload: true,
    videoPreload: "metadata",
    primaryImagePriority: false
  }
};

export function getMediaViewerSurfaceConfig(surface: MediaViewerSurface = "listingGallery") {
  return mediaViewerSurfaceConfigs[surface];
}
