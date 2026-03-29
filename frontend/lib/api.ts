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

async function postAPI<T>(endpoint: string, data: Record<string, string>): Promise<T> {
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
  return fetchAPI<ValuationResult>(
    `/api/valuation?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&neighborhood=${encodeURIComponent(neighborhood)}`
  );
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
  location?: string
): Promise<SubscribeResponse> {
  const data: Record<string, string> = { email, context };
  if (location) data.location = location;
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
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
