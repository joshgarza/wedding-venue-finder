import "dotenv/config";
import path from "path";
import fs from "fs";
import axios from "axios";
import bcrypt from "bcrypt";
import { db } from "../db/db-config";

// --- Venue name data ---
const VENUE_NAMES = [
  "Sunset Gardens Estate",
  "The Grand Pavilion",
  "Malibu Ranch Estate",
  "Rosewood Manor",
  "Pacific Bluffs Vineyard",
  "The Ivory Terrace",
  "Hillcrest Gardens",
  "Chateau de la Mer",
  "Silver Lake Lodge",
  "The Willow Grove",
  "Canyon Vista Ranch",
  "Bella Rosa Estate",
  "The Crystal Ballroom",
  "Laurel Canyon Retreat",
  "The Orchard House",
  "Magnolia Ridge",
  "The Coastal Chapel",
  "Hacienda del Sol",
  "Starlight Terrace",
  "The Greenwood Estate",
  "Echo Park Pavilion",
  "The Heritage House",
  "Topanga Creek Gardens",
  "The Marble Fountain",
  "Bel Air Garden Estate",
  "The Rustic Barn at Oak Hill",
  "Lavender Fields Estate",
  "The Lighthouse Club",
  "Pasadena Rose Garden",
  "The Velvet Lounge",
  "Griffith Park Overlook",
  "The Wisteria Pavilion",
  "Santa Monica Bluff Estate",
  "The Copper Lantern",
  "Calabasas Country Club",
  "The Enchanted Garden",
  "Hollywood Hills Manor",
  "The Stone Bridge Estate",
  "Redondo Beach Club",
  "The Sage Meadow",
  "Thousand Oaks Vineyard",
  "The Gilded Lily",
  "Altadena Heritage Estate",
  "The Ivy Wall",
  "Palos Verdes Terrace",
  "The Amber Room",
  "Ojai Valley Ranch",
  "The Cobblestone Courtyard",
  "Marina del Rey Yacht Club",
  "The Moonlit Arbor",
];

// --- Curated picsum IDs (buildings/gardens/nature) ---
const PICSUM_IDS = [
  164, 174, 177, 188, 190, 249, 250, 260, 274, 287, 308, 313, 318, 323, 326,
  335, 338, 342, 344, 348, 356, 357, 360, 365, 366, 370, 374, 376, 380, 384,
  386, 387, 391, 392, 396, 399, 401, 405, 410, 416, 417, 421, 424, 425, 429,
  431, 433, 437, 439, 449,
];

const PRICING_TIERS = ["low", "medium", "high", "luxury"] as const;

function randomLat(): number {
  return 33.7 + Math.random() * 0.6; // 33.7 - 34.3
}

function randomLng(): number {
  return -118.7 + Math.random() * 0.9; // -118.7 to -117.8
}

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(): boolean {
  return Math.random() > 0.5;
}

/** Pick n unique random items from arr */
function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(
  url: string,
  dest: string
): Promise<boolean> {
  if (fs.existsSync(dest)) {
    return false; // already exists, skip
  }

  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });

  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  fs.writeFileSync(dest, response.data);
  return true;
}

async function main() {
  console.log("Starting seed...\n");

  let venuesInserted = 0;
  let imagesDownloaded = 0;
  let userCreated = false;

  // --- 1. Seed venues ---
  console.log("Seeding 50 venues...");

  const venueRows: Array<{
    osm_id: string;
    name: string;
    venue_type: string;
    is_wedding_venue: boolean;
    pre_vetting_status: string;
    has_lodging: boolean;
    lodging_capacity: number;
    is_estate: boolean;
    is_historic: boolean;
    pricing_tier: string;
    is_active: boolean;
    location_lat_long: ReturnType<typeof db.raw>;
  }> = [];

  const venueCoords: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < 50; i++) {
    const lat = randomLat();
    const lng = randomLng();
    venueCoords.push({ lat, lng });

    const hasLodging = randomBool();
    venueRows.push({
      osm_id: `node/seed_${i + 1}`,
      name: VENUE_NAMES[i],
      venue_type: "other",
      is_wedding_venue: true,
      pre_vetting_status: "yes",
      has_lodging: hasLodging,
      lodging_capacity: hasLodging ? Math.floor(Math.random() * 200) + 10 : 0,
      is_estate: randomBool(),
      is_historic: randomBool(),
      pricing_tier: randomPick(PRICING_TIERS),
      is_active: true,
      location_lat_long: db.raw("ST_SetSRID(ST_MakePoint(?, ?), 4326)", [
        lng,
        lat,
      ]),
    });
  }

  // Insert venues with upsert
  for (const row of venueRows) {
    await db("venues").insert(row).onConflict("osm_id").merge();
  }

  // Fetch inserted venues to get their IDs
  const venues = await db("venues")
    .select("venue_id", "osm_id", "name")
    .whereIn(
      "osm_id",
      venueRows.map((r) => r.osm_id)
    );

  venuesInserted = venues.length;
  console.log(`  Upserted ${venuesInserted} venues.`);

  // --- 2. Download images ---
  console.log("\nDownloading images...");

  const dataDir = path.resolve(__dirname, "..", "data", "venues");

  for (const venue of venues) {
    const numImages = 3 + Math.floor(Math.random() * 3); // 3-5
    const selectedIds = pickN(PICSUM_IDS, numImages);
    const localPaths: string[] = [];

    const venueImageDir = path.join(
      dataDir,
      venue.venue_id,
      "raw_images"
    );

    for (let n = 0; n < selectedIds.length; n++) {
      const picsumId = selectedIds[n];
      const url = `https://picsum.photos/id/${picsumId}/800/600`;
      const dest = path.join(venueImageDir, `img_${n + 1}.jpg`);

      try {
        const downloaded = await downloadImage(url, dest);
        if (downloaded) {
          imagesDownloaded++;
          console.log(`  Downloaded: ${venue.name} - img_${n + 1}.jpg`);
        } else {
          console.log(`  Skipped (exists): ${venue.name} - img_${n + 1}.jpg`);
        }
        localPaths.push(dest);
      } catch (err: any) {
        console.error(
          `  Failed: ${venue.name} - img_${n + 1}.jpg: ${err.message}`
        );
      }

      // 500ms delay between downloads
      await delay(500);
    }

    // --- 3. Update image_data JSONB ---
    if (localPaths.length > 0) {
      await db("venues").where("venue_id", venue.venue_id).update({
        image_data: JSON.stringify({
          local_paths: localPaths,
          processed_at: new Date().toISOString(),
        }),
      });
    }
  }

  // --- 4. Seed test user ---
  console.log("\nSeeding test user...");

  const passwordHash = await bcrypt.hash("test1234", 10);
  const result = await db("users")
    .insert({
      email: "test@example.com",
      password_hash: passwordHash,
    })
    .onConflict("email")
    .ignore()
    .returning("user_id");

  if (result.length > 0) {
    userCreated = true;
    console.log("  Created test user: test@example.com");
  } else {
    console.log("  Test user already exists, skipped.");
  }

  // --- Summary ---
  console.log("\n--- Seed Summary ---");
  console.log(`Venues upserted:   ${venuesInserted}`);
  console.log(`Images downloaded:  ${imagesDownloaded}`);
  console.log(`Test user created:  ${userCreated ? "yes" : "no (already existed)"}`);
  console.log("--------------------\n");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    db.destroy();
  });
