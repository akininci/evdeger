"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NearbyLinks } from "@/lib/api";

// Source logos/icons
const SOURCE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  Emlakjet: {
    icon: "🏠",
    color: "text-blue-700",
    bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  Sahibinden: {
    icon: "🟡",
    color: "text-yellow-700",
    bg: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
  },
  Hepsiemlak: {
    icon: "🔴",
    color: "text-red-700",
    bg: "bg-red-50 hover:bg-red-100 border-red-200",
  },
};

function LinkCard({ source, url, label }: { source: string; url: string; label: string }) {
  const config = SOURCE_CONFIG[source] || {
    icon: "🔗",
    color: "text-gray-700",
    bg: "bg-gray-50 hover:bg-gray-100 border-gray-200",
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ${config.bg}`}
    >
      <span className="text-xl flex-shrink-0">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${config.color}`}>{source}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
      <svg
        className="w-4 h-4 text-muted-foreground flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

export function NearbyListings({ links }: { links: NearbyLinks }) {
  if (!links || (!links.sale?.length && !links.rent?.length)) {
    return null;
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-xl">📍</span>
          Bu bölgedeki ilanları inceleyin
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Farklı platformlardaki güncel ilanları karşılaştırın
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Satılık */}
        {links.sale?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span>🏷️</span> Satılık İlanlar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {links.sale.map((link) => (
                <LinkCard
                  key={`sale-${link.source}`}
                  source={link.source}
                  url={link.url}
                  label={link.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Kiralık */}
        {links.rent?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <span>🔑</span> Kiralık İlanlar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {links.rent.map((link) => (
                <LinkCard
                  key={`rent-${link.source}`}
                  source={link.source}
                  url={link.url}
                  label={link.label}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
