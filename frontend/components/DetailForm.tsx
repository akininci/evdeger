"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTL } from "@/lib/api";

interface DetailFormProps {
  basePricePerSqm: number;
}

const roomOptions = ["1+0", "1+1", "2+1", "3+1", "4+1", "5+1"];

export function DetailForm({ basePricePerSqm }: DetailFormProps) {
  const [sqm, setSqm] = useState("");
  const [rooms, setRooms] = useState("");
  const [floor, setFloor] = useState("");
  const [buildingAge, setBuildingAge] = useState("");
  const [result, setResult] = useState<{ low: number; avg: number; high: number } | null>(null);

  const handleCalculate = () => {
    const sqmVal = parseInt(sqm) || 100;

    // Room multiplier
    const roomMultipliers: Record<string, number> = {
      "1+0": 0.85, "1+1": 0.92, "2+1": 1.0, "3+1": 1.05, "4+1": 1.08, "5+1": 1.10,
    };
    const roomMult = roomMultipliers[rooms] || 1.0;

    // Floor multiplier (higher floors slightly more valuable)
    const floorVal = parseInt(floor) || 3;
    const floorMult = floorVal <= 1 ? 0.95 : floorVal >= 8 ? 1.05 : 1.0;

    // Age multiplier (newer = more valuable)
    const ageVal = parseInt(buildingAge) || 10;
    const ageMult = ageVal <= 2 ? 1.15 : ageVal <= 5 ? 1.08 : ageVal <= 10 ? 1.0 : ageVal <= 20 ? 0.92 : 0.85;

    const adjustedPrice = basePricePerSqm * roomMult * floorMult * ageMult;
    const avgValue = Math.round(adjustedPrice * sqmVal);

    setResult({
      low: Math.round(avgValue * 0.9),
      avg: avgValue,
      high: Math.round(avgValue * 1.1),
    });
  };

  return (
    <Card className="shadow-lg border-dashed border-2 border-brand-navy/20">
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <span>🔍</span>
          Daha Hassas Sonuç İçin Detay Girin
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Daire bilgilerinizi girerek kişiselleştirilmiş değerleme alın
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              m² (Metrekare)
            </label>
            <Input
              type="number"
              placeholder="120"
              value={sqm}
              onChange={(e) => setSqm(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Oda Sayısı
            </label>
            <select
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Seçin</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Bulunduğu Kat
            </label>
            <Input
              type="number"
              placeholder="3"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Bina Yaşı
            </label>
            <Input
              type="number"
              placeholder="5"
              value={buildingAge}
              onChange={(e) => setBuildingAge(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <Button
          onClick={handleCalculate}
          className="w-full h-11 bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold"
        >
          🔄 Yeniden Hesapla
        </Button>

        {result && (
          <div className="mt-5 p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10 text-center animate-fade-in-up">
            <p className="text-sm text-muted-foreground mb-1">Kişiselleştirilmiş Tahmini Değer</p>
            <p className="text-3xl font-bold text-brand-navy">
              {formatTL(result.avg)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatTL(result.low)} — {formatTL(result.high)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
