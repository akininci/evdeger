import type { MetadataRoute } from "next";
import { mockCities, mockDistricts } from "@/lib/mock-data";
import { articles } from "@/lib/articles";

const BASE_URL = "https://evdeger.durinx.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/sonuc`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/rehber`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Rehber/Article pages
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/rehber/${article.slug}`,
    lastModified: new Date(article.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // City pages (81)
  const cityPages: MetadataRoute.Sitemap = mockCities.map((city) => ({
    url: `${BASE_URL}/${city.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // District pages
  const districtPages: MetadataRoute.Sitemap = [];
  for (const [citySlug, districts] of Object.entries(mockDistricts)) {
    for (const district of districts) {
      districtPages.push({
        url: `${BASE_URL}/${citySlug}/${district.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    }
  }

  return [...staticPages, ...articlePages, ...cityPages, ...districtPages];
}
