"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { register } from "@/lib/api";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await register(email, name);
      setSuccess(true);
    } catch {
      setError("Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-brand-green/30 bg-brand-green/5 shadow-lg">
        <CardContent className="pt-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Kayıt Başarılı!
          </h3>
          <p className="text-sm text-muted-foreground">
            Detaylı rapor kısa süre içinde email adresinize gönderilecektir.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-brand-navy/20 shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <span>📧</span>
          Detaylı Rapor Almak İçin Kayıt Olun
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Bölgenize özel detaylı emlak raporu email adresinize gönderilecektir.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Adınız"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            aria-label="Adınız"
          />
          <Input
            type="email"
            placeholder="Email adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
            aria-label="Email adresiniz"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-11 bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gönderiliyor...
              </span>
            ) : (
              "Ücretsiz Rapor Al"
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Email adresiniz güvendedir. Spam göndermeyiz.
        </p>
      </CardContent>
    </Card>
  );
}
