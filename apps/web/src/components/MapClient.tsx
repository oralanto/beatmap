"use client";

import dynamic from "next/dynamic";
import type { Meta } from "@/lib/api";

const MapExplorer = dynamic(() => import("./MapExplorer"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100dvh-3.5rem)] animate-pulse bg-zinc-100" />
  ),
});

export function MapClient({ meta }: { meta: Meta | null }) {
  return <MapExplorer meta={meta} />;
}
