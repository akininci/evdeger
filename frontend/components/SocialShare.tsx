"use client";

interface SocialShareProps {
  city: string;
  district: string;
  neighborhood: string;
  estimatedValue?: string;
}

export function SocialShare({ city, district, neighborhood, estimatedValue }: SocialShareProps) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = estimatedValue
    ? `${neighborhood}, ${district} bölgesinde evimin tahmini değeri ${estimatedValue}! 🏠 EvDeğer ile ücretsiz öğrendim.`
    : `${neighborhood}, ${district} bölgesinin emlak değerlerini EvDeğer ile keşfettim! 🏠`;

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: "💬",
      color: "bg-green-600 hover:bg-green-700",
      url: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
    },
    {
      name: "X (Twitter)",
      icon: "𝕏",
      color: "bg-black hover:bg-gray-800",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "Facebook",
      icon: "📘",
      color: "bg-blue-700 hover:bg-blue-800",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span>📤</span> Bu değerlemeyi paylaş
      </h3>
      <div className="flex flex-wrap gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all ${link.color}`}
          >
            <span>{link.icon}</span>
            {link.name}
          </a>
        ))}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-muted transition-all"
        >
          📋 Link Kopyala
        </button>
      </div>
    </div>
  );
}
