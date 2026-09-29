import { CalendarPlus, ExternalLink, MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GenreIcon } from "@/components/GenreIcon";
import { Link } from "@/i18n/navigation";
import { fetchEvent } from "@/lib/api";
import { flagEmoji, formatLongDate, GENRE_GRADIENT } from "@/lib/format";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEvent(id);
  return { title: event?.title ?? "Event" };
}

export default async function EventPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [event, t] = await Promise.all([fetchEvent(id), getTranslations()]);
  if (!event) notFound();

  const place = [event.venue, event.address].filter(Boolean).join(", ") || [event.city, event.country].filter(Boolean).join(", ");
  const mapsUrl =
    event.lat !== null && event.lng !== null
      ? `https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=16/${event.lat}/${event.lng}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(place)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DanceEvent",
    name: event.title,
    startDate: event.startTime ? `${event.startDate}T${event.startTime}` : event.startDate,
    endDate: event.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue ?? event.city ?? event.country,
      address: event.address ?? undefined,
      ...(event.lat !== null && event.lng !== null
        ? { geo: { "@type": "GeoCoordinates", latitude: event.lat, longitude: event.lng } }
        : {}),
    },
    url: event.sourceUrl,
  };

  const button =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/" className="text-sm font-medium text-violet-700 hover:underline">
        ← {t("event.back")}
      </Link>

      <article className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className={`flex items-center justify-between bg-gradient-to-br ${GENRE_GRADIENT[event.genre]} p-6 text-white sm:p-8`}>
          <div>
            <span className="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold backdrop-blur">{t(`genres.${event.genre}`)}</span>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-4xl">{event.title}</h1>
          </div>
          <GenreIcon genre={event.genre} className="hidden size-16 shrink-0 opacity-80 sm:block" />
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("event.when")}</dt>
              <dd className="mt-1 text-lg font-semibold">{formatLongDate(event.startDate, event.endDate, locale)}</dd>
              <dd className="text-zinc-600">
                {event.startTime ? t("event.startsAt", { time: event.startTime }) : t("event.allDay")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("event.where")}</dt>
              <dd className="mt-1 flex items-start gap-2 text-lg font-semibold">
                <MapPin className="mt-1 size-5 shrink-0 text-violet-600" aria-hidden />
                <span>
                  {flagEmoji(event.countryCode)} {event.venue ?? event.city ?? event.country}
                </span>
              </dd>
              {event.address && <dd className="text-zinc-600">{event.address}</dd>}
              {event.city && <dd className="text-zinc-600">{[event.city, event.country].filter(Boolean).join(", ")}</dd>}
            </div>
          </dl>

          {event.styles.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("event.styles")}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {event.styles.map((s) => (
                  <li key={s} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-800">
                    {t(`styles.${s}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className={`${button} bg-violet-600 text-white hover:bg-violet-700`}>
              <ExternalLink className="size-4" aria-hidden /> {t("event.viewSource", { source: event.sourceName })}
            </a>
            <a href={`/api/events/${event.id}/calendar.ics`} className={`${button} border border-zinc-300 hover:bg-zinc-50`}>
              <CalendarPlus className="size-4" aria-hidden /> {t("event.addToCalendar")}
            </a>
            {event.lat !== null && event.lng !== null && (
              <Link href={`/map?center=${event.lat},${event.lng}`} className={`${button} border border-zinc-300 hover:bg-zinc-50`}>
                <MapPin className="size-4" aria-hidden /> {t("event.showOnMap")}
              </Link>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`${button} border border-zinc-300 hover:bg-zinc-50`}>
              <Navigation className="size-4" aria-hidden /> {t("event.openInMaps")}
            </a>
          </div>

          <p className="text-xs text-zinc-500">{t("event.source", { source: event.sourceName })}</p>
        </div>
      </article>
    </main>
  );
}
