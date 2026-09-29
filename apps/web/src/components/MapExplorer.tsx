"use client";

import { Loader2, LocateFixed } from "lucide-react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MLMap,
  type Marker,
  type Popup,
} from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EventDTO, EventsResponse } from "@beatmap/shared";
import type { Meta } from "@/lib/api";
import { parseFilters, toApiParams } from "@/lib/filters";
import { GENRE_COLOR } from "@/lib/format";
import { EventCard } from "./EventCard";
import { FilterDrawer } from "./FilterDrawer";
import { Filters } from "./Filters";

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/positron";
const RADII = [25, 50, 100, 250, 500];
const ZOOM_FOR_RADIUS: Record<number, number> = {
  25: 10,
  50: 9,
  100: 8,
  250: 6.5,
  500: 5.5,
};

type Coords = { lat: number; lng: number };

function NearMe({
  me,
  geoState,
  radius,
  onToggle,
  onRadius,
  compact,
}: {
  me: Coords | null;
  geoState: "idle" | "locating" | "denied";
  radius: number;
  onToggle: () => void;
  onRadius: (r: number) => void;
  compact?: boolean;
}) {
  const t = useTranslations("map");
  return (
    <div
      className={
        compact ? "flex items-center gap-2 overflow-x-auto pb-1" : "space-y-3"
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!!me}
        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
          me
            ? "bg-violet-600 text-white"
            : "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
        }`}
      >
        {geoState === "locating" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="size-4" aria-hidden />
        )}
        {geoState === "locating" ? t("locating") : t("nearMe")}
      </button>
      {me && (
        <div
          className="flex shrink-0 items-center gap-1.5"
          role="group"
          aria-label={t("radius")}
        >
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadius(r)}
              aria-pressed={radius === r}
              className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 transition ${
                radius === r
                  ? "bg-zinc-900 text-white ring-zinc-900"
                  : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      )}
      {geoState === "denied" && !compact && (
        <p className="text-sm text-amber-700">{t("denied")}</p>
      )}
    </div>
  );
}

export default function MapExplorer({ meta }: { meta: Meta | null }) {
  const t = useTranslations("map");
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);
  const filterKey = JSON.stringify(filters);
  const centerParam = searchParams.get("center");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const meMarkerRef = useRef<Marker | null>(null);
  const eventsById = useRef(new Map<string, EventDTO>());
  const skipFitRef = useRef(!!centerParam);

  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<EventDTO[]>([]);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [me, setMe] = useState<Coords | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied">(
    "idle",
  );
  const [radius, setRadius] = useState(100);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return setGeoState("denied");
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("idle");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const toggleMe = () => {
    if (me) {
      setMe(null);
      skipFitRef.current = false;
    } else {
      locate();
    }
  };

  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((r) => r.state === "granted" && locate())
      .catch(() => undefined);
  }, [locate]);

  // Fetch events whenever filters / location / radius change.
  useEffect(() => {
    const ctrl = new AbortController();
    const p = toApiParams(JSON.parse(filterKey));
    p.set("hasCoords", "true");
    p.set("limit", "1000");
    if (me) {
      p.set("lat", String(me.lat));
      p.set("lng", String(me.lng));
      p.set("radiusKm", String(radius));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag the start of an external fetch
    setStatus("loading");
    fetch(`/api/events?${p}`, { signal: ctrl.signal })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<EventsResponse>)
          : Promise.reject(new Error(String(r.status))),
      )
      .then((data) => {
        setEvents(data.items);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setStatus("error");
      });
    return () => ctrl.abort();
  }, [filterKey, me, radius]);

  // Map setup.
  useEffect(() => {
    if (!containerRef.current) return;
    const [clat, clng] = (centerParam ?? "").split(",").map(Number);
    const hasCenter = Number.isFinite(clat) && Number.isFinite(clng);
    let map: MLMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: hasCenter ? [clng!, clat!] : [8, 47],
        zoom: hasCenter ? 13 : 3.6,
        attributionControl: { compact: true },
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- report external map initialization failure
      setMapUnavailable(true);
      return;
    }
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;
    setPopupEl(document.createElement("div"));

    map.on("load", () => {
      map.addSource("events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 45,
        clusterMaxZoom: 13,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "events",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#8b5cf6",
            10,
            "#7c3aed",
            30,
            "#5b21b6",
          ],
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
          "circle-stroke-width": 3,
          "circle-stroke-color": "rgba(255,255,255,0.85)",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "events",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "events",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "genre"],
            ...Object.entries(GENRE_COLOR).flat(),
            "#64748b",
          ] as unknown as string,
          "circle-radius": 9,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "clusters", async (e) => {
        const f = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        })[0];
        if (!f) return;
        const src = map.getSource("events") as GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
        map.easeTo({
          center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom + 0.5,
        });
      });

      map.on("click", "points", (e) => {
        const feats = map.queryRenderedFeatures(e.point, {
          layers: ["points"],
        });
        const list = [...new Set(feats.map((f) => f.properties.id as string))]
          .map((id) => eventsById.current.get(id))
          .filter((x): x is EventDTO => !!x);
        const first = feats[0];
        if (!first || list.length === 0) return;
        popupRef.current?.remove();
        setSelected(list);
        const popup = new maplibregl.Popup({
          className: "beatmap-popup",
          maxWidth: "none",
          offset: 14,
          focusAfterOpen: false,
        })
          .setLngLat(
            (first.geometry as GeoJSON.Point).coordinates as [number, number],
          )
          .addTo(map);
        popup.on("close", () => setSelected([]));
        popupRef.current = popup;
      });

      for (const layer of ["clusters", "points"]) {
        map.on(
          "mouseenter",
          layer,
          () => (map.getCanvas().style.cursor = "pointer"),
        );
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
      meMarkerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach the React-rendered card content to the popup.
  useEffect(() => {
    if (popupRef.current && popupEl && selected.length)
      popupRef.current.setDOMContent(popupEl);
  }, [selected, popupEl]);

  // Push data into the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    eventsById.current = new Map(events.map((e) => [e.id, e]));
    (map.getSource("events") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: events.map((e) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.lng!, e.lat!] },
        properties: { id: e.id, genre: e.genre },
      })),
    });
    popupRef.current?.remove();

    if (status !== "ready" || me || events.length === 0) return;
    if (skipFitRef.current) {
      skipFitRef.current = false;
      return;
    }
    const b = new maplibregl.LngLatBounds();
    events.forEach((e) => b.extend([e.lng!, e.lat!]));
    map.fitBounds(b, { padding: 60, maxZoom: 9, duration: 600 });
  }, [events, mapReady, status, me]);

  // User position marker + camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    meMarkerRef.current?.remove();
    meMarkerRef.current = null;
    if (!me) return;
    const el = document.createElement("div");
    el.className =
      "size-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.25)]";
    meMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([me.lng, me.lat])
      .addTo(map);
    map.flyTo({
      center: [me.lng, me.lat],
      zoom: ZOOM_FOR_RADIUS[radius] ?? 8,
      duration: 800,
    });
  }, [me, radius, mapReady]);

  const countLabel = useMemo(
    () => t("results", { count: events.length }),
    [t, events.length],
  );

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {mapUnavailable && (
        <section
          className="absolute inset-0 overflow-y-auto bg-zinc-100 px-4 pb-24 pt-24 lg:pl-95 lg:pt-6"
          aria-live="polite"
        >
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-4 text-lg font-semibold text-zinc-800">
              {t("mapUnavailable")}
            </h1>
            {status === "loading" ? (
              <p className="text-sm text-zinc-600">{t("loading")}</p>
            ) : status === "error" ? (
              <p className="text-sm text-zinc-600">{t("error")}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-zinc-600">{countLabel}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Desktop side panel */}
      <aside className="absolute bottom-4 left-4 top-4 z-10 hidden w-85 flex-col gap-5 overflow-y-auto rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur lg:flex">
        <NearMe
          me={me}
          geoState={geoState}
          radius={radius}
          onToggle={toggleMe}
          onRadius={setRadius}
        />
        <p className="text-sm font-medium text-zinc-600" aria-live="polite">
          {status === "loading"
            ? t("loading")
            : status === "error"
              ? t("error")
              : countLabel}
        </p>
        <Filters meta={meta} />
      </aside>

      {/* Mobile controls */}
      <div className="absolute inset-x-0 top-0 z-10 p-3 lg:hidden">
        <NearMe
          me={me}
          geoState={geoState}
          radius={radius}
          onToggle={toggleMe}
          onRadius={setRadius}
          compact
        />
        {geoState === "denied" && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 shadow">
            {t("denied")}
          </p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <FilterDrawer meta={meta} resultCount={events.length} />
        <span
          className="rounded-full bg-white/95 px-3 py-2 text-xs font-semibold shadow-lg"
          aria-live="polite"
        >
          {status === "loading"
            ? t("loading")
            : status === "error"
              ? t("error")
              : countLabel}
        </span>
      </div>

      {popupEl &&
        selected.length > 0 &&
        createPortal(
          <div className="max-h-[50dvh] space-y-2 overflow-y-auto bg-zinc-50 p-2">
            {selected.map((e) => (
              <EventCard key={e.id} event={e} compact />
            ))}
          </div>,
          popupEl,
        )}
    </div>
  );
}
