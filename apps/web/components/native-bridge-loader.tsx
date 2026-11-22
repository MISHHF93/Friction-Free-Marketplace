"use client";

import nextDynamic from "next/dynamic";

export const NativeBridge = nextDynamic(
  () => import("@/components/native-bridge").then((mod) => mod.NativeBridge),
  { ssr: false }
);
