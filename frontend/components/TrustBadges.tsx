import { Badge } from "@/components/ui/badge";

const badges = [
  { icon: "🏘️", label: "81 il" },
  { icon: "💰", label: "Ücretsiz" },
  { icon: "⚡", label: "Anında sonuç" },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {badges.map((badge) => (
        <Badge
          key={badge.label}
          variant="secondary"
          className="px-4 py-2 text-sm font-medium bg-white/80 dark:bg-muted/80 backdrop-blur-sm border border-border/50 shadow-sm"
        >
          <span className="mr-1.5">{badge.icon}</span>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
