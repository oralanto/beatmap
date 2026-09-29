import { CalendarDays, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { EventDTO } from "@beatmap/shared";
import { Link } from "@/i18n/navigation";
import {
  flagEmoji,
  formatDateRange,
  GENRE_GRADIENT,
  isHappeningNow,
} from "@/lib/format";
import { GenreIcon } from "./GenreIcon";

export function EventCard({
  event,
  compact = false,
}: {
  event: EventDTO;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const place = [event.venue, event.city].filter(Boolean).join(" · ");
  const now = isHappeningNow(event.startDate, event.endDate);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
    >
      <div
        className={`relative flex items-center justify-between bg-gradient-to-br ${GENRE_GRADIENT[event.genre]} ${compact ? "h-16 px-3" : "h-28 px-4"} text-white`}
      >
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <span className="relative rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold backdrop-blur">
          {t(`genres.${event.genre}`)}
        </span>
        <GenreIcon
          genre={event.genre}
          className={`relative opacity-90 ${compact ? "size-7" : "size-10"}`}
        />
      </div>

      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center gap-1.5 text-sm font-medium text-violet-700">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span>{formatDateRange(event.startDate, event.endDate, locale)}</span>
          {event.startTime && event.startDate === event.endDate && (
            <span className="text-zinc-500">· {event.startTime}</span>
          )}
          {now && (
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {t("card.today")}
            </span>
          )}
        </div>

        <h3
          className={`font-semibold leading-snug text-zinc-900 group-hover:text-violet-700 ${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-lg"}`}
        >
          {event.title}
        </h3>

        <div className="flex items-start gap-1.5 text-sm text-zinc-600">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="line-clamp-2">
            <span aria-hidden>{flagEmoji(event.countryCode)}</span>{" "}
            {place || event.country}
            {event.distanceKm !== undefined && (
              <span className="ml-1 font-medium text-zinc-900">
                · {t("card.away", { km: Math.round(event.distanceKm) })}
              </span>
            )}
          </span>
        </div>

        {!compact && event.styles.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {event.styles.slice(0, 4).map((s) => (
              <li
                key={s}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
              >
                {t(`styles.${s}`)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
