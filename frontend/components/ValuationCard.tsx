"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTL } from "@/lib/api";

interface ValuationCardProps {
  title: string;
  icon: string;
  low: number;
  high: number;
  average: number;
  suffix?: string;
  accentColor?: "green" | "blue";
}

function useAnimatedNumber(target: number, duration: number = 1000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(startValue + (target - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

export function ValuationCard({
  title,
  icon,
  low,
  high,
  average,
  suffix = "",
  accentColor = "blue",
}: ValuationCardProps) {
  const animatedAvg = useAnimatedNumber(average, 1200);
  const animatedLow = useAnimatedNumber(low, 1000);
  const animatedHigh = useAnimatedNumber(high, 1400);

  const borderColor =
    accentColor === "green"
      ? "border-t-brand-green"
      : "border-t-brand-navy";

  const avgColor =
    accentColor === "green"
      ? "text-brand-green"
      : "text-brand-navy dark:text-blue-400";

  return (
    <Card className={`border-t-4 ${borderColor} shadow-lg hover:shadow-xl transition-shadow`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
          <span className="text-2xl">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Range */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatTL(animatedLow)}</span>
            <span className="text-xs">—</span>
            <span>{formatTL(animatedHigh)}</span>
          </div>

          {/* Progress bar visual */}
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                accentColor === "green" ? "bg-brand-green" : "bg-brand-navy"
              }`}
              style={{ width: "100%" }}
            />
          </div>

          {/* Average */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground mb-1">Ortalama</p>
            <p className={`text-3xl sm:text-4xl font-bold ${avgColor} animate-count-up`}>
              {formatTL(animatedAvg)}
              {suffix && (
                <span className="text-lg font-normal text-muted-foreground ml-1">
                  {suffix}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
