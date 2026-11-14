import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export function ProfileAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = getInitials(name);

  return (
    <div
      role="img"
      aria-label={`Profile initials for ${name || "user"}`}
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-primary p-3 text-primary-foreground ring-1 ring-primary/20",
        className
      )}
    >
      <span className="select-none font-heading text-6xl font-semibold leading-none tracking-tight sm:text-7xl">
        {initials}
      </span>
    </div>
  );
}
