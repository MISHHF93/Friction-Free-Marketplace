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
