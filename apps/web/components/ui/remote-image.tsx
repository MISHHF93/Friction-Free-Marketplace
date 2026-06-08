/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from "react";

export type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> & {
  alt: string;
};

/**
 * Renders externally hosted marketplace images without routing arbitrary seller
 * media through the Next.js image optimizer.
 */
export function RemoteImage({ alt, loading = "lazy", decoding = "async", ...props }: RemoteImageProps) {
  return <img alt={alt} loading={loading} decoding={decoding} {...props} />;
}
