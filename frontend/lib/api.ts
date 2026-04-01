const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface City {
  name: string;
  slug: string;
}

export interface District {
  name: string;
  slug: string;
}

export interface Neighborhood {
  name: string;
  slug: string;
}

export interface SimilarListing {
  title: string;
  price: number;
  sqm: number;
  rooms: string;
  source: string;
  url: string;
  imageUrl?: string;
}

export interface NearbyLink {
  source: string;
  url: string;
  label: string;
}

export interface NearbyLinks {
  sale: NearbyLink[];
  rent: NearbyLink[];
}

export interface ValuationResult {
  city: string;
  district: string;
  neighborhood: string;
  avg_price_per_sqm: number;
  median_price_per_sqm: number;
  min_price_per_sqm: number;
  max_price_per_sqm: number;
  avg_rent_per_sqm: number;
  sample_size: number;
  yoy_change: number;
  typical_sqm: number;
  estimated_value_low: number;
  estimated_value_high: number;
  estimated_value_avg: number;
  estimated_rent_low: number;
  estimated_rent_high: number;
  estimated_rent_avg: number;
  trend_data: TrendDataPoint[];
  // New extended fields
  active_listings: number;
  avg_apartment_size: number;
  region_score: number; // 1-10
  investment_potential: "Düşük" | "Orta" | "Yüksek";
  gross_rental_yield: number; // percentage
  amortization_years: number;
  similar_listings: SimilarListing[];
  nearby_links?: NearbyLinks;
}

export interface TrendDataPoint {
  month: string;
  price_per_sqm: number;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function postAPI<T>(endpoint: string, data: Record<string, string | undefined>): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getCities(): Promise<City[]> {
  return fetchAPI<City[]>("/api/locations/cities");
}

export async function getDistricts(city: string): Promise<District[]> {
  return fetchAPI<District[]>(`/api/locations/districts?city=${encodeURIComponent(city)}`);
}

export async function getNeighborhoods(city: string, district: string): Promise<Neighborhood[]> {
  return fetchAPI<Neighborhood[]>(
    `/api/locations/neighborhoods?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`
  );
}

export async function getValuation(
  city: string,
  district: string,
  neighborhood: string
): Promise<ValuationResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await fetchAPI(
    `/api/valuation?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&neighborhood=${encodeURIComponent(neighborhood)}`
  );
  
  // Transform nested API response to flat ValuationResult
  return {
    city: raw.city || city,
    district: raw.district || district,
    neighborhood: raw.neighborhood || neighborhood,
    avg_price_per_sqm: raw.sale?.avg_price_per_sqm ?? raw.avg_price_per_sqm ?? 0,
    median_price_per_sqm: raw.sale?.median_price_per_sqm ?? raw.median_price_per_sqm ?? 0,
    min_price_per_sqm: raw.sale?.min_price ?? raw.min_price_per_sqm ?? 0,
    max_price_per_sqm: raw.sale?.max_price ?? raw.max_price_per_sqm ?? 0,
    avg_rent_per_sqm: raw.rent?.avg_rent_per_sqm ?? raw.avg_rent_per_sqm ?? 0,
    sample_size: raw.sale?.sample_size ?? raw.sample_size ?? 0,
    yoy_change: raw.sale?.yoy_change ?? raw.yoy_change ?? 0,
    typical_sqm: raw.stats?.avg_sqm ?? raw.typical_sqm ?? 100,
    estimated_value_low: raw.estimated_value_low ?? 0,
    estimated_value_high: raw.estimated_value_high ?? 0,
    estimated_value_avg: raw.estimated_value_mid ?? raw.estimated_value_avg ?? 0,
    estimated_rent_low: raw.estimated_rent_low ?? 0,
    estimated_rent_high: raw.estimated_rent_high ?? 0,
    estimated_rent_avg: raw.estimated_rent_mid ?? raw.estimated_rent_avg ?? 0,
    trend_data: (raw.trend || []).map((t: { month?: string; date?: string; price_per_sqm?: number; avg_price_per_sqm?: number }) => ({
      month: t.month || t.date || "",
      price_per_sqm: t.price_per_sqm || t.avg_price_per_sqm || 0,
    })),
    active_listings: raw.sale?.sample_size ?? raw.active_listings ?? 0,
    avg_apartment_size: raw.stats?.avg_sqm ?? raw.avg_apartment_size ?? 100,
    region_score: raw.stats?.investment_score ?? raw.region_score ?? 5,
    investment_potential: raw.stats?.investment_label ?? raw.investment_potential ?? "Orta",
    gross_rental_yield: raw.stats?.gross_rental_yield ?? raw.gross_rental_yield ?? 0,
    amortization_years: raw.stats?.amortization_years ?? raw.amortization_years ?? 0,
    similar_listings: raw.similar_listings || [],
    nearby_links: raw.nearby_links,
    confidence: raw.sale?.confidence,
    confidence_label: raw.sale?.confidence_label,
    data_source: raw.data_source,
    is_mock: raw.is_mock ?? false,
    disclaimer: raw.disclaimer,
  } as ValuationResult;
}

export async function register(email: string, name: string): Promise<RegisterResponse> {
  return postAPI<RegisterResponse>("/api/auth/register", { email, name });
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  already_subscribed: boolean;
}

export async function subscribe(
  email: string,
  context: string = "general",
  location?: string,
  locationCity?: string,
  locationDistrict?: string,
  locationNeighborhood?: string,
): Promise<SubscribeResponse> {
  const data: Record<string, string | undefined> = { email, context };
  if (location) data.location = location;
  if (locationCity) data.location_city = locationCity;
  if (locationDistrict) data.location_district = locationDistrict;
  if (locationNeighborhood) data.location_neighborhood = locationNeighborhood;
  return postAPI<SubscribeResponse>("/api/subscribe", data);
}

// Format price in Turkish Lira
export function formatTL(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format number with Turkish locale (dot separator)
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("tr-TR").format(amount);
}

// Format percentage
export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export interface UnsubscribeResponse {
  success: boolean;
  message: string;
}

export async function unsubscribeWithToken(token: string): Promise<UnsubscribeResponse> {
  return fetchAPI<UnsubscribeResponse>(`/api/unsubscribe?token=${encodeURIComponent(token)}`);
}
