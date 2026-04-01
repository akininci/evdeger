"use client";

import { useState, useEffect } from "react";

const STEPS = [
  { icon: "🔍", text: "Sahibinden ilanları kontrol ediliyor...", duration: 1500 },
  { icon: "🏠", text: "Hepsiemlak verileri analiz ediliyor...", duration: 1500 },
  { icon: "📊", text: "Bölgedeki satışlar karşılaştırılıyor...", duration: 1500 },
  { icon: "🏛️", text: "Belediye ve tapu kayıtları kontrol ediliyor...", duration: 1200 },
  { icon: "📈", text: "Fiyat trendi hesaplanıyor...", duration: 1000 },
  { icon: "🎯", text: "Değerleme tamamlanıyor...", duration: 800 },
];

export function SearchAnimation({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = STEPS.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;
    
    const interval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
      
      // Calculate current step
      let accumulated = 0;
      for (let i = 0; i < STEPS.length; i++) {
        accumulated += STEPS[i].duration;
        if (elapsed < accumulated) {
          setCurrentStep(i);
          break;
        }
      }
      
      if (elapsed >= totalDuration) {
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 px-4">
      {/* Animated house icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center animate-pulse">
          <span className="text-5xl">{STEPS[currentStep]?.icon || "🏠"}</span>
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-blue-500" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Current step text */}
      <div className="text-center">
        <p className="text-lg font-medium text-foreground animate-pulse">
          {STEPS[currentStep]?.text || "Hesaplanıyor..."}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Birden fazla kaynak analiz ediliyor
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Analiz ediliyor</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Completed steps */}
      <div className="w-full max-w-md space-y-2">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 text-sm transition-all duration-300 ${
              i < currentStep
                ? "text-emerald-600 dark:text-emerald-400"
                : i === currentStep
                ? "text-foreground font-medium"
                : "text-muted-foreground/50"
            }`}
          >
            <span className="flex-shrink-0">
              {i < currentStep ? "✅" : i === currentStep ? step.icon : "⏳"}
            </span>
            <span>{step.text.replace("...", "")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
