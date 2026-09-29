import type { EventDTO } from "@beatmap/shared";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const compact = (d: string) => d.replaceAll("-", "");

function addDay(d: string): string {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, day + 1));
  return next.toISOString().slice(0, 10).replaceAll("-", "");
}

export function toICS(e: EventDTO): string {
  const location = [e.venue, e.address, e.country].filter(Boolean).join(", ");
  const time = e.startTime?.replace(":", "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BeatMap//Events//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@beatmap`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    // Events with a known start time on a single day are timed (floating local time), everything else is all-day.
    time && e.startDate === e.endDate
      ? `DTSTART:${compact(e.startDate)}T${time}00`
      : `DTSTART;VALUE=DATE:${compact(e.startDate)}`,
    ...(time && e.startDate === e.endDate ? [] : [`DTEND;VALUE=DATE:${addDay(e.endDate)}`]),
    `SUMMARY:${esc(e.title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    `URL:${e.sourceUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
