#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

type Venue = {
  id?: string;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  wikidataId?: string | null;
  website_source?: string | null;
  // keep anything else
  [k: string]: any;
};

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function numArg(name: string, def: number): number {
  const v = getArg(name);
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name} must be a number`);
  return n;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function qidFromEntityUrl(entityUrl: string): string | null {
  // "http://www.wikidata.org/entity/Q123" -> "Q123"
  const m = entityUrl.match(/\/entity\/(Q\d+)$/);
  return m?.[1] ?? null;
}

async function wdqsLookupWebsiteByNameAndLocation(opts: {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
}): Promise<{ qid: string; website: string } | null> {
  const endpoint = "https://query.wikidata.org/sparql";
  const labelPattern = escapeForRegex(opts.name);

  // Tight, fast query:
  // - spatial prefilter
  // - label contains match
  // - pull official website (P856)
  const query = `
SELECT ?item ?itemLabel ?website WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(${opts.lng} ${opts.lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${opts.radiusKm}" .
    bd:serviceParam wikibase:distance ?distMeters .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }

  FILTER(BOUND(?itemLabel) && REGEX(?itemLabel, "${labelPattern}", "i"))
  OPTIONAL { ?item wdt:P856 ?website . }

  FILTER(BOUND(?website))
}
ORDER BY ?distMeters
LIMIT ${opts.limit}
`.trim();

  const url = new URL(endpoint);
  url.searchParams.set("format", "json");
  url.searchParams.set("query", query);

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": "wedding-venue-finder/0.1 (personal use)",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WDQS HTTP ${res.status}\n${text.slice(0, 400)}`);
  }

  const json = await res.json();
  const rows: any[] = json?.results?.bindings ?? [];
  if (!rows.length) return null;

  const itemUrl = rows[0]?.item?.value;
  const website = rows[0]?.website?.value;

  const qid = typeof itemUrl === "string" ? qidFromEntityUrl(itemUrl) : null;
  if (!qid || typeof website !== "string" || !website) return null;

  return { qid, website };
}

async function main() {
  const inPath = getArg("in") ?? "data/01_missing_websites.ndjson";
  const outPath = getArg("out") ?? "data/01_missing_websites_wikidata.ndjson";
  const stillMissingPath = getArg("stillMissing") ?? "data/01_still_missing_websites.ndjson";

  const radiusKm = numArg("radiusKm", 5);
  const limit = numArg("limit", 5);
  const delayMs = numArg("delayMs", 300); // be polite

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const out = fs.createWriteStream(outPath, { flags: "w" });
  const still = fs.createWriteStream(stillMissingPath, { flags: "w" });

  const rl = readline.createInterface({
    input: fs.createReadStream(inPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let total = 0;
  let enriched = 0;
  let skipped = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    total++;
    const v: Venue = JSON.parse(trimmed);

    const name = typeof v.name === "string" ? v.name.trim() : "";
    const lat = typeof v.lat === "number" ? v.lat : null;
    const lng = typeof v.lng === "number" ? v.lng : null;

    if (!name || lat === null || lng === null) {
      skipped++;
      still.write(JSON.stringify(v) + "\n");
      out.write(JSON.stringify(v) + "\n");
      continue;
    }

    // Only attempt if missing website
    if (v.website) {
      out.write(JSON.stringify(v) + "\n");
      continue;
    }

    try {
      const hit = await wdqsLookupWebsiteByNameAndLocation({
        name,
        lat,
        lng,
        radiusKm,
        limit,
      });

      if (hit) {
        enriched++;
        const updated = {
          ...v,
          website: hit.website,
          wikidataId: hit.qid,
          website_source: "wikidata",
        };
        out.write(JSON.stringify(updated) + "\n");
      } else {
        still.write(JSON.stringify(v) + "\n");
        out.write(JSON.stringify(v) + "\n");
      }
    } catch (e) {
      // Fail gracefully: keep record, mark an error field
      const updated = { ...v, wikidata_error: String(e).slice(0, 200) };
      still.write(JSON.stringify(updated) + "\n");
      out.write(JSON.stringify(updated) + "\n");
    }

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  out.end();
  still.end();

  process.stderr.write(
    `done. total=${total} enriched=${enriched} skipped=${skipped}\n` +
      `wrote: ${outPath}\n` +
      `still missing: ${stillMissingPath}\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

