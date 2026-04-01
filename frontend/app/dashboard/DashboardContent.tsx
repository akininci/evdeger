"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { formatTL } from "@/lib/api";

type Tab = "saved" | "history" | "settings";

interface SavedHome {
  key: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  estimatedValue?: number;
  savedAt: string;
}

interface SearchHistoryItem {
  city: string;
  district: string;
  neighborhood: string;
  timestamp: string;
  estimatedValue?: number;
}

interface UserSettings {
  emailNotifications: boolean;
  preferredCity: string;
  preferredDistrict: string;
}

const CITIES = [
  "İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Trabzon",
  "Muğla", "Kocaeli", "Adana", "Gaziantep", "Mersin", "Konya",
  "Eskişehir", "Diyarbakır", "Samsun", "Denizli", "Kayseri", "Hatay",
  "Sakarya", "Tekirdağ",
];

/* ── Sign-In CTA for unauthenticated users ── */
function SignInCTA() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 text-center">
        {/* Glass card */}
        <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-8 sm:p-12 backdrop-blur-xl shadow-2xl shadow-black/30">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 text-4xl shadow-lg">
            📊
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Kişisel Emlak Panelin
          </h1>
          <p className="text-white/60 mb-8 leading-relaxed">
            Kayıtlı evlerini takip et, arama geçmişini gör ve kişisel ayarlarını yönet.
            Giriş yaparak paneline eriş.
          </p>

          <SignInButton mode="modal">
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-[0.98]">
              🔓 Giriş Yap
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </SignInButton>

          <p className="mt-4 text-sm text-white/40">
            Hesabın yok mu?{" "}
            <Link href="/sign-up" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Kayıt ol
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/30">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            Ücretsiz
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            Güvenli
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            Kişisel bilgi istemiyoruz
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Toggle Switch Component ── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
        enabled ? "bg-emerald-500" : "bg-slate-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── Main Dashboard Content ── */
export default function DashboardContent() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("saved");
  const [savedHomes, setSavedHomes] = useState<SavedHome[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: false,
    preferredCity: "",
    preferredDistrict: "",
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    try {
      const homes = JSON.parse(localStorage.getItem("evdeger_saved_homes") || "[]");
      setSavedHomes(homes);
    } catch { setSavedHomes([]); }

    try {
      const history = JSON.parse(localStorage.getItem("evdeger_search_history") || "[]");
      setSearchHistory(history);
    } catch { setSearchHistory([]); }

    try {
      const saved = JSON.parse(localStorage.getItem("evdeger_user_settings") || "{}");
      setSettings((prev) => ({ ...prev, ...saved }));
    } catch { /* use defaults */ }
  }, []);

  const removeSavedHome = useCallback((key: string) => {
    setSavedHomes((prev) => {
      const filtered = prev.filter((h) => h.key !== key);
      localStorage.setItem("evdeger_saved_homes", JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem("evdeger_search_history");
    setSearchHistory([]);
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("evdeger_user_settings", JSON.stringify(next));
      return next;
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
        <div className="animate-spin h-10 w-10 border-3 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not signed in → show CTA
  if (!isSignedIn) {
    return <SignInCTA />;
  }

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "saved", label: "Kayıtlı Evler", icon: "❤️", count: savedHomes.length },
    { key: "history", label: "Arama Geçmişi", icon: "🔍", count: searchHistory.length },
    { key: "settings", label: "Ayarlar", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-950/50 to-slate-950">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="absolute top-0 right-1/4 h-[200px] w-[200px] rounded-full bg-emerald-500/8 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Hoş geldin, {user?.firstName || "Kullanıcı"} 👋
              </h1>
              <p className="text-white/50 mt-1">
                Kişisel emlak panelin
              </p>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10 ring-2 ring-white/20",
                },
              }}
            />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: "Kayıtlı Ev", value: savedHomes.length, icon: "🏠" },
              { label: "Arama", value: searchHistory.length, icon: "🔍" },
              { label: "Üyelik", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR", { month: "short", year: "numeric" }) : "-", icon: "📅" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4 text-center"
              >
                <span className="text-xl">{stat.icon}</span>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-white/[0.06] border border-white/10 text-white/60 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/50"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ SAVED HOMES TAB ═══ */}
        {activeTab === "saved" && (
          <div className="animate-fade-in-up">
            {savedHomes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-3xl">
                  🏠
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Henüz kayıtlı evin yok
                </h3>
                <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
                  Değerleme sonuçlarında ❤️ butonuna tıklayarak evleri buraya kaydet.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all duration-200 hover:-translate-y-0.5"
                >
                  🔍 Değerleme Yap
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {savedHomes.map((home) => (
                  <div
                    key={home.key}
                    className="group rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.1] hover:border-emerald-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {home.district}{home.neighborhood ? `, ${home.neighborhood}` : ""}
                        </h3>
                        <p className="text-sm text-white/40 mt-0.5">{home.city}</p>
                        {home.estimatedValue && (
                          <p className="text-lg font-bold text-emerald-400 mt-2">
                            {formatTL(home.estimatedValue)}
                          </p>
                        )}
                        {home.savedAt && (
                          <p className="text-xs text-white/30 mt-1">
                            Kaydedildi: {new Date(home.savedAt).toLocaleDateString("tr-TR")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeSavedHome(home.key)}
                        className="ml-2 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Kaldır"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <Link
                        href={`/sonuc?city=${encodeURIComponent(home.city || "")}&district=${encodeURIComponent(home.district || "")}&neighborhood=${encodeURIComponent(home.neighborhood || "")}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Raporu Gör
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SEARCH HISTORY TAB ═══ */}
        {activeTab === "history" && (
          <div className="animate-fade-in-up">
            {searchHistory.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={clearHistory}
                  className="text-sm text-white/40 hover:text-red-400 transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Geçmişi Temizle
                </button>
              </div>
            )}

            {searchHistory.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Arama geçmişin boş
                </h3>
                <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
                  Değerleme yaptığında otomatik olarak burada görünecek.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all duration-200 hover:-translate-y-0.5"
                >
                  🔍 Değerleme Yap
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {searchHistory.map((item, i) => (
                  <div
                    key={i}
                    className="group rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4 flex items-center justify-between transition-all duration-200 hover:bg-white/[0.1] hover:border-blue-500/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">
                          {item.district}, {item.neighborhood}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-white/40">{item.city}</span>
                          <span className="text-white/20">·</span>
                          <span className="text-xs text-white/30">
                            {new Date(item.timestamp).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {item.estimatedValue && (
                          <p className="text-xs font-semibold text-emerald-400 mt-1">
                            {formatTL(item.estimatedValue)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/sonuc?city=${encodeURIComponent(item.city)}&district=${encodeURIComponent(item.district)}&neighborhood=${encodeURIComponent(item.neighborhood)}`}
                      className="flex-shrink-0 ml-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors opacity-60 group-hover:opacity-100"
                    >
                      Tekrar Gör
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {activeTab === "settings" && (
          <div className="animate-fade-in-up space-y-4">
            {/* Account Info */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">👤</span> Hesap Bilgileri
                </h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  { label: "Ad Soyad", value: user?.fullName || "-" },
                  { label: "Email", value: user?.primaryEmailAddress?.emailAddress || "-" },
                  { label: "Üyelik Tarihi", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "-" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white/40">{row.label}</span>
                    <span className="text-sm font-medium text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">🔔</span> Bildirimler
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Email Bildirimleri</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Kayıtlı evlerindeki fiyat değişikliklerinden haberdar ol
                    </p>
                  </div>
                  <Toggle
                    enabled={settings.emailNotifications}
                    onChange={(v) => updateSettings({ emailNotifications: v })}
                  />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">📍</span> Tercihler
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">
                    Tercih Ettiğin Şehir
                  </label>
                  <select
                    value={settings.preferredCity}
                    onChange={(e) => updateSettings({ preferredCity: e.target.value, preferredDistrict: "" })}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Seçiniz...</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city} className="bg-slate-900">{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">
                    Tercih Ettiğin İlçe
                  </label>
                  <input
                    type="text"
                    value={settings.preferredDistrict}
                    onChange={(e) => updateSettings({ preferredDistrict: e.target.value })}
                    placeholder="İlçe adını yaz..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Save confirmation */}
            {settingsSaved && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 animate-fade-in-up">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                Ayarlar kaydedildi
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
