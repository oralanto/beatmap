import { GraduationCap, Mic, Music, PartyPopper, Sparkles, Swords, Tent, Theater, Trophy } from "lucide-react";
import type { Genre } from "@beatmap/shared";

const ICONS = {
  battle: Swords,
  show: Theater,
  workshop: GraduationCap,
  conference: Mic,
  festival: PartyPopper,
  jam: Music,
  competition: Trophy,
  camp: Tent,
  other: Sparkles,
} satisfies Record<Genre, unknown>;

export function GenreIcon({ genre, className }: { genre: Genre; className?: string }) {
  const Icon = ICONS[genre];
  return <Icon className={className} aria-hidden />;
}
