#!/usr/bin/env node
/**
 * Generate complete Turkey locations data (81 il + all ilçeler + mahalleler)
 * Sources:
 * - turkey-geolocation-rest-api.vercel.app (81 il + ilçeler)
 * - github.com/ferhat-mousavi/turkiye-il-ilce-mahalle-koy (mahalleler)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function slugify(text) {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, handler).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    };
    https.get(url, handler).on('error', reject);
  });
}

function cleanMahalleName(name) {
  // Remove "Mahallesi̇", "Mahallesi", "Mah.", "mah" suffix
  return name
    .replace(/\s*mahallesi̇?\s*$/i, '')
    .replace(/\s*mah\.?\s*$/i, '')
    .replace(/\r/g, '')
    .trim();
}

function titleCase(str) {
  // Proper Turkish title case
  return str
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      // Handle İ specifically  
      const first = word.charAt(0).toUpperCase();
      const rest = word.slice(1).toLowerCase();
      return first + rest;
    })
    .join(' ')
    .replace(/\bi\b/g, 'İ'); // Fix standalone 'i' 
}

// Büyükşehir illeri - bunlar için mahalle ekleyeceğiz
const BUYUKSEHIR = [
  'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa',
  'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri',
  'Diyarbakır', 'Eskişehir', 'Samsun', 'Denizli', 'Şanlıurfa',
  'Sakarya', 'Trabzon', 'Malatya', 'Erzurum', 'Van',
  'Manisa', 'Balıkesir', 'Aydın', 'Tekirdağ', 'Hatay',
  'Kahramanmaraş', 'Mardin', 'Muğla', 'Ordu', 'Kocaeli'
];

async function main() {
  console.log('📥 Fetching city/district data from API...');
  const apiData = await fetchJSON('https://turkey-geolocation-rest-api.vercel.app/cities?fields=city,towns&limit=100');
  
  if (!apiData.status || !apiData.data) {
    throw new Error('API returned invalid data');
  }
  
  console.log(`✅ Got ${apiData.data.length} cities from API`);
  
  console.log('📥 Fetching mahalle data from GitHub...');
  const mahalleData = await fetchJSON('https://raw.githubusercontent.com/ferhat-mousavi/turkiye-il-ilce-mahalle-koy/main/turkiye-il-ilce-mahalle-koy.json');
  
  const mahalleKeys = Object.keys(mahalleData);
  console.log(`✅ Got mahalle data for ${mahalleKeys.length} cities`);
  
  // Build a mapping from city name to mahalle data
  // The mahalle data uses: {"Adana": {"Seyhan": ["mahalle1", ...], ...}, ...}
  // Normalize city names for matching
  function normalizeName(name) {
    return name.normalize('NFC')
      .replace(/[\u0300-\u036f]/g, '') // strip combining marks (fixes İzmi̇r etc)
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .trim();
  }
  
  // Build normalized lookup for mahalle data
  const mahalleByCity = {};
  for (const cityName of mahalleKeys) {
    const normalized = normalizeName(cityName);
    mahalleByCity[normalized] = mahalleData[cityName];
  }
  
  // Process each city
  const cities = [];
  
  for (const cityEntry of apiData.data) {
    const cityName = cityEntry.city;
    const citySlug = slugify(cityName);
    const normalizedCity = normalizeName(cityName);
    const isBuyuksehir = BUYUKSEHIR.some(b => normalizeName(b) === normalizedCity);
    
    // Get mahalle data for this city
    const cityMahalleData = mahalleByCity[normalizedCity] || {};
    
    // Build district list
    const districts = [];
    
    if (cityEntry.towns && cityEntry.towns.length > 0) {
      for (const town of cityEntry.towns) {
        const districtName = town.name;
        const districtSlug = slugify(districtName);
        
        // Find mahalle data for this district
        let neighborhoods = [];
        
        if (isBuyuksehir) {
          // Try to find matching district in mahalle data
          const normalizedDistrict = normalizeName(districtName);
          let mahalleList = null;
          
          for (const [dName, dMahalles] of Object.entries(cityMahalleData)) {
            if (normalizeName(dName) === normalizedDistrict) {
              mahalleList = dMahalles;
              break;
            }
          }
          
          if (mahalleList && Array.isArray(mahalleList)) {
            neighborhoods = mahalleList
              .map(m => cleanMahalleName(m))
              .filter(m => m && m.length > 0)
              .map(m => {
                // Title case the name properly
                const name = titleCase(m);
                return { name, slug: slugify(name) };
              })
              .filter(n => n.slug && n.slug.length > 0)
              // Remove duplicates
              .filter((n, i, arr) => arr.findIndex(x => x.slug === n.slug) === i)
              .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          }
        }
        
        const district = {
          name: districtName,
          slug: districtSlug,
          neighborhoods
        };
        
        districts.push(district);
      }
    }
    
    // Sort districts alphabetically (Turkish locale)
    districts.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    
    cities.push({
      name: cityName,
      slug: citySlug,
      districts
    });
  }
  
  // Sort cities alphabetically (Turkish locale)
  cities.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  
  const result = { cities };
  
  // Stats
  let totalDistricts = 0;
  let totalNeighborhoods = 0;
  for (const city of cities) {
    totalDistricts += city.districts.length;
    for (const d of city.districts) {
      totalNeighborhoods += d.neighborhoods.length;
    }
  }
  
  console.log(`\n📊 Stats:`);
  console.log(`  İl: ${cities.length}`);
  console.log(`  İlçe: ${totalDistricts}`);
  console.log(`  Mahalle: ${totalNeighborhoods}`);
  
  // Write output
  const outputPath = path.join(__dirname, '..', 'backend', 'data', 'locations.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n✅ Written to ${outputPath}`);
  console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Verify
  const verify = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  console.log(`\n🔍 Verification:`);
  console.log(`  Cities: ${verify.cities.length}`);
  console.log(`  İstanbul districts: ${verify.cities.find(c => c.slug === 'istanbul')?.districts.length}`);
  console.log(`  Ankara districts: ${verify.cities.find(c => c.slug === 'ankara')?.districts.length}`);
  console.log(`  İzmir districts: ${verify.cities.find(c => c.slug === 'izmir')?.districts.length}`);
  
  // Show a sample
  const istanbul = verify.cities.find(c => c.slug === 'istanbul');
  if (istanbul) {
    const kadikoy = istanbul.districts.find(d => d.slug === 'kadikoy');
    if (kadikoy) {
      console.log(`  Kadıköy mahalleler: ${kadikoy.neighborhoods.length}`);
      console.log(`  İlk 5: ${kadikoy.neighborhoods.slice(0, 5).map(n => n.name).join(', ')}`);
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
