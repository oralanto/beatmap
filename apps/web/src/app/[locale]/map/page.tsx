import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { MapClient } from "@/components/MapClient";
import { fetchMeta } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("map") };
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const meta = await fetchMeta();
  return (
    <main>
      <Suspense>
        <MapClient meta={meta} />
      </Suspense>
    </main>
  );
}
