import { createElement } from "react";
import {
  Apple,
  BookOpen,
  Brain,
  Brush,
  Droplet,
  Dumbbell,
  Footprints,
  Heart,
  Moon,
  NotebookPen,
  PencilLine,
  Sparkles,
  Sprout,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";

export const HABIT_ICON_OPTIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "water", label: "Water", icon: Droplet },
  { value: "reading", label: "Reading", icon: BookOpen },
  { value: "running", label: "Running", icon: Footprints },
  { value: "meditation", label: "Meditation", icon: Brain },
  { value: "strength", label: "Strength", icon: Dumbbell },
  { value: "nutrition", label: "Nutrition", icon: Apple },
  { value: "sleep", label: "Sleep", icon: Moon },
  { value: "writing", label: "Writing", icon: NotebookPen },
  { value: "focus", label: "Focus", icon: Target },
  { value: "growth", label: "Growth", icon: Sprout },
  { value: "heart", label: "Heart", icon: Heart },
  { value: "walking", label: "Walking", icon: Footprints },
  { value: "creativity", label: "Creativity", icon: PencilLine },
  { value: "sunshine", label: "Sunshine", icon: Sun },
  { value: "self-care", label: "Self care", icon: Brush },
];

const LEGACY_EMOJI_ICONS: Record<string, string> = {
  "✨": "sparkles",
  "💧": "water",
  "📚": "reading",
  "🏃": "running",
  "🧘": "meditation",
  "💪": "strength",
  "🥗": "nutrition",
  "💤": "sleep",
  "📝": "writing",
  "🎯": "focus",
  "🌱": "growth",
  "❤️": "heart",
  "🚶": "walking",
  "🎨": "creativity",
  "☀️": "sunshine",
  "🪥": "self-care",
};

const ICONS_BY_VALUE = new Map(
  HABIT_ICON_OPTIONS.map((option) => [option.value, option.icon])
);

export function getHabitIcon(value: string) {
  return (
    ICONS_BY_VALUE.get(LEGACY_EMOJI_ICONS[value] ?? value) ??
    HABIT_ICON_OPTIONS[0].icon
  );
}

export function HabitIcon({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const Icon = getHabitIcon(value);
  return createElement(Icon, { className, "aria-hidden": true });
}
