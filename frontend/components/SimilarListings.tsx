"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTL, formatNumber } from "@/lib/api";
import type { SimilarListing } from "@/lib/api";

interface SimilarListingsProps {
  listings: SimilarListing[];
}

export function SimilarListings({ listings }: SimilarListingsProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <span>🏘️</span>
        Bu Bölgedeki Güncel İlanlar
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.map((listing, i) => (
          <a
            key={i}
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-0.5 border-border/60">
              {/* Placeholder image area */}
              <div className="h-32 bg-gradient-to-br from-muted to-muted/50 rounded-t-xl flex items-center justify-center">
                <span className="text-4xl opacity-40">🏠</span>
              </div>
              <CardContent className="pt-3 pb-4">
                <p className="text-sm font-medium text-foreground line-clamp-1 mb-2 group-hover:text-brand-navy transition-colors">
                  {listing.title}
                </p>
                <p className="text-lg font-bold text-brand-navy mb-2">
                  {formatTL(listing.price)}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {listing.sqm} m²
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {listing.rooms}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {listing.source}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatTL(Math.round(listing.price / listing.sqm))}/m²
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
