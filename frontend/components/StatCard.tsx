import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
}

export function StatCard({ icon, label, value, subtext, valueColor }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 text-center">
        <span className="text-2xl mb-2 block">{icon}</span>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={`text-xl font-bold ${valueColor || "text-foreground"}`}>{value}</p>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
