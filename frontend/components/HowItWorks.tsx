const steps = [
  {
    number: "1",
    icon: "📍",
    title: "Adresini Gir",
    description: "İl, ilçe ve mahallenizi seçin. Türkiye genelinde 81 ilde hizmet veriyoruz.",
  },
  {
    number: "2",
    icon: "📊",
    title: "Analiz Edilsin",
    description: "Güncel ilan verileri ve bölge istatistikleri ile değerleme yapılır.",
  },
  {
    number: "3",
    icon: "✅",
    title: "Sonucunu Gör",
    description: "Tahmini satış ve kira değerini, bölge trendlerini anında görün.",
  },
];

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="py-20 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Nasıl Çalışır?
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            3 basit adımda evinizin değerini öğrenin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-border" />
              )}

              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-navy text-3xl mb-5 shadow-lg">
                {step.icon}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-white text-xs font-bold">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
              </div>

              <p className="text-muted-foreground text-sm max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
