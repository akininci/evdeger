"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Neighborhood } from "@/lib/api";

interface DistrictValuationFormProps {
  citySlug: string;
  districtSlug: string;
  neighborhoods: Neighborhood[];
}

export function DistrictValuationForm({
  citySlug,
  districtSlug,
  neighborhoods,
}: DistrictValuationFormProps) {
  const router = useRouter();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");

  const handleSubmit = () => {
    if (!selectedNeighborhood) return;
    router.push(
      `/sonuc?city=${encodeURIComponent(citySlug)}&district=${encodeURIComponent(districtSlug)}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`
    );
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={selectedNeighborhood}
        onValueChange={(v) => setSelectedNeighborhood(v || "")}
        disabled={neighborhoods.length === 0}
      >
        <SelectTrigger
          className="flex-1 h-12 bg-white dark:bg-muted border-border text-base"
          aria-label="Mahalle seçin"
        >
          <SelectValue
            placeholder={
              neighborhoods.length === 0
                ? "Bu ilçe için mahalle verisi henüz eklenmedi"
                : "Mahalle seçin"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {neighborhoods.map((n) => (
            <SelectItem key={n.slug} value={n.slug}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!selectedNeighborhood}
        className="h-12 px-8 text-base font-semibold bg-brand-green hover:bg-brand-green-dark text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-xl hover:shadow-brand-green/30 disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
      >
        🔍 Değerini Öğren
      </Button>
    </div>
  );
}
