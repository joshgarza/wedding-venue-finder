# Two-Pass Crawl Plan

**Created:** 2026-02-21
**Status:** Planned (not yet implemented)
**Affects:** Stage 2 (Crawl)

---

## Motivation

The current Stage 2 uses crawl4ai (Playwright headless browser) for **every page** in the BFS — each page spins up a browser context requiring 1GB shared memory. With BFS depth 3 and up to 10 links per page, that is potentially ~111 browser renders per venue. Most wedding venue sites are server-rendered (WordPress, Squarespace, static) and don't need a headless browser.

## Executive Summary

Convert Stage 2 from always using crawl4ai to a two-pass approach: **Pass 1** uses lightweight `axios` GET + `turndown` HTML-to-markdown conversion, falling back to **Pass 2** (crawl4ai) only when Pass 1 yields insufficient content — indicating a JavaScript-rendered SPA.

Expected savings: **70-85%** of venues handled by Pass 1. Each lightweight fetch takes ~50-200ms vs ~2-5s for crawl4ai. Net **3-10x faster** for lightweight-eligible venues, plus reduced memory pressure.

---

## New Dependency: `turndown`

**Package:** `turndown` (v7.2.2) + `@types/turndown`

Why turndown over `node-html-markdown`:
- **CommonJS support**: Ships `lib/turndown.cjs.js` as `main` entry. Project uses `"module": "CommonJS"` in tsconfig, so it works out of the box
- **Image preservation**: Converts `<img>` to `![alt](src)` — the exact format Stage 3's `extractImageUrls` regex expects
- **Customizable rules**: Can strip `<nav>`, `<footer>`, `<script>`, `<style>` to approximate crawl4ai's content pruning
- **Single dependency**: Only requires `@mixmark-io/domino` (~15KB total)
- **Maturity**: 10.7k GitHub stars, 2.6M weekly downloads

Install: `npm install turndown @types/turndown`

---

## Architecture: Swappable Fetcher in the Same BFS Loop

A **single BFS loop with a pluggable fetch function**. The BFS loop doesn't care how a page is fetched — it only needs markdown content and internal links back. Both passes return the same shape.

**Strategy decision is per-venue, on the homepage:** Try Pass 1 on the homepage (depth 1). If it fails the SPA detection threshold, switch the entire venue to Pass 2 (crawl4ai) for all pages. Rationale: if the homepage is an SPA, sub-pages will be too.

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `turndown` and `@types/turndown` |
| `src/utils/page-fetcher.ts` | **New** | `PageFetchResult` type, `fetchPageLightweight()`, `fetchPageCrawl4ai()`, `needsHeavyweightCrawl()`, `extractLinksFromHtml()`, `createTurndownService()` |
| `src/pipeline/stage_2_crawl.ts` | Modify | Import from `page-fetcher`, restructure BFS loop for two-pass strategy, add lightweight/heavyweight counters |

No other files change. Stage 3, 4, 5 are untouched. No migration needed. No Docker config changes.

---

## Unified Page Fetch Interface

### `src/utils/page-fetcher.ts`

```typescript
export type PageFetchResult = {
  markdown: string | null;   // Converted markdown content (null = fetch failed)
  links: string[];           // Internal link URLs extracted from the page
  byteLength: number;        // Raw HTML body length (for diagnostics)
  _rawHtml?: string;         // Only populated by lightweight fetcher, used for SPA detection
};
```

### Lightweight Fetcher

```typescript
export async function fetchPageLightweight(
  url: string,
  turndownService: TurndownService
): Promise<PageFetchResult>
```

- `axios.get(url, { timeout: 10000, headers: { 'User-Agent': '...' }, maxRedirects: 3, maxContentLength: 5 * 1024 * 1024 })`
- Same User-Agent as pre-vetting stage: `'Mozilla/5.0 (compatible; WeddingVenueFinder/1.0; +https://weddingvenuefinder.com)'`
- Validates `Content-Type: text/html` before conversion
- Parses HTML with Turndown for markdown
- Extracts links with regex on raw HTML
- Returns `{ markdown, links, byteLength: html.length, _rawHtml: html }`

### Heavyweight Fetcher

```typescript
export async function fetchPageCrawl4ai(url: string): Promise<PageFetchResult>
```

- Existing `axios.post('http://127.0.0.1:11235/crawl', ...)` logic extracted here
- Normalizes `result.links.internal` into `string[]`
- Returns same `PageFetchResult` shape (no `_rawHtml`)

---

## SPA Detection Heuristic

Runs **once per venue, on the homepage result from Pass 1**. Any signal triggers fallback to crawl4ai for the entire venue.

```typescript
export function needsHeavyweightCrawl(result: PageFetchResult, rawHtml: string): boolean
```

### Signal 1 — Stripped text too short

Markdown (with syntax stripped to plain text) is fewer than **200 characters**. Catches SPA shells that render `<div id="root"></div>` and nothing else.

### Signal 2 — SPA framework markers with empty body

`<body>` contains fewer than 3 content tags (`<p>`, `<h[1-6]>`, `<li>`, `<td>`, `<article>`, `<section>`) AND contains a `<script>` tag referencing a JS bundle (`bundle.js`, `main.js`, `app.js`, `chunk`).

### Signal 3 — Very low text-to-HTML ratio

Plain text length / raw HTML length below **0.05** (5%). Server-rendered pages typically have 10-30%.

### Signal 4 — Fetch failure

If `result.markdown === null` (403, timeout, etc.), fall back to crawl4ai.

```typescript
export function needsHeavyweightCrawl(result: PageFetchResult, rawHtml: string): boolean {
  // Signal 1: Markdown content too short
  const plainText = (result.markdown ?? '').replace(/[#*\[\]()!\-_>|`]/g, '').trim();
  if (plainText.length < 200) return true;

  // Signal 2: SPA framework markers with empty body
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? rawHtml;
  const contentTags = (bodyHtml.match(/<(p|h[1-6]|li|td|article|section)\b/gi) || []).length;
  const hasBundleScript = /<script[^>]+src=["'][^"']*\b(bundle|main|app|chunk)\b/i.test(bodyHtml);
  if (contentTags < 3 && hasBundleScript) return true;

  // Signal 3: Very low text-to-HTML ratio
  const textRatio = plainText.length / rawHtml.length;
  if (textRatio < 0.05) return true;

  return false;
}
```

---

## Link Extraction from Raw HTML

```typescript
export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      links.push(resolved);
    } catch {
      // Skip malformed URLs
    }
  }

  return [...new Set(links)]; // Deduplicate
}
```

Why regex instead of cheerio: avoids adding cheerio (~500KB). Pre-vetting stage already uses regex for HTML parsing — consistent pattern. `new URL(match[1], baseUrl)` handles relative URLs correctly.

---

## Content Filtering for Pass 1 (Turndown Configuration)

crawl4ai uses `content_filter: { type: 'pruning', threshold: 0.48, min_word_threshold: 75 }`. For Pass 1, use Turndown's `remove` option to strip common boilerplate:

```typescript
function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Remove boilerplate elements (approximate content pruning)
  td.remove(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe', 'form']);

  return td;
}
```

This is a reasonable approximation for wedding venue sites (content-heavy marketing pages). Downstream stages are tolerant:
- Stage 3 (Images): Extracts URLs from markdown `![alt](url)` — unaffected by boilerplate removal
- Stage 4 (Enrichment): Uses first 3000 chars — stripping boilerplate makes content more dense, **improving** LLM extraction quality

---

## Revised BFS Loop in `stage_2_crawl.ts`

```typescript
import TurndownService from 'turndown';
import {
  fetchPageLightweight,
  fetchPageCrawl4ai,
  needsHeavyweightCrawl,
  type PageFetchResult,
} from "../utils/page-fetcher";

// Inside crawlStage.run():

const turndownService = createTurndownService();
let lightweightCount = 0;
let heavyweightCount = 0;

for (const venue of venues) {
  let useHeavyweight = false; // Determined by homepage probe

  // ... existing BFS queue setup ...

  // Inside the per-page fetch logic:
  if (useHeavyweight) {
    fetchResult = await fetchPageCrawl4ai(item.url);
  } else {
    fetchResult = await fetchPageLightweight(item.url, turndownService);

    // On homepage (depth 1), decide strategy for entire venue
    if (item.depth === 1) {
      if (needsHeavyweightCrawl(fetchResult, fetchResult._rawHtml)) {
        console.log(`  -> ${venue.name}: SPA detected, switching to crawl4ai`);
        fetchResult = await fetchPageCrawl4ai(item.url);
        useHeavyweight = true;
        heavyweightCount++;
      } else {
        lightweightCount++;
      }
    }
  }

  // ... rest of BFS (aggregation, link queuing) unchanged ...

  const method = useHeavyweight ? 'crawl4ai' : 'lightweight';
  console.log(`Done ${venue.name}: ${visited.size} pages [${method}] | ${aggregatedMarkdown.length} chars`);
}

console.log(`\nCrawl summary: ${lightweightCount} lightweight, ${heavyweightCount} crawl4ai`);
```

---

## Output Format Compatibility

Output format is unchanged:

```
\n--- {url} (depth {n}) ---\n{markdown_content}
```

Applied in the BFS loop (not fetchers), so it's identical regardless of fetcher used.

**Downstream compatibility confirmed:**
- **Stage 3** (`extractImageUrls`): Regex `!\[.*?\]\((https?:\/\/.*?)\)` — turndown produces this exact syntax from `<img>` tags
- **Stage 4** (`enrichmentStage`): `venue.raw_markdown.substring(0, 3000)` — markdown format is text with headers and paragraphs, same from turndown

---

## Edge Cases

| Case | Handling |
|------|----------|
| Bot protection / 403 | `needsHeavyweightCrawl` returns true on null markdown, falls back to crawl4ai |
| Redirects to different domain | `axios` follows via `maxRedirects: 3`, resolve links against final URL |
| Non-HTML Content-Type | Skip conversion, return `{ markdown: null, links: [], byteLength: 0 }` |
| Large HTML (>5MB) | `maxContentLength: 5 * 1024 * 1024` in axios config |
| Lazy-loaded images (`data-src`) | Turndown only reads `<img src>`. Sites with heavy lazy loading tend to be SPAs that trigger crawl4ai fallback anyway |

---

## Testing Strategy

1. **Unit tests** for `needsHeavyweightCrawl`: minimal SPA HTML, rich server-rendered HTML, borderline cases
2. **Unit tests** for `extractLinksFromHtml`: relative URLs, absolute URLs, fragments, malformed URLs
3. **Integration**: Existing `npm run test:crawl` — BFS loop behavior is transparent to downstream
4. **Manual verification**: Run against known venues, compare `raw_markdown` quality between old and new approach

---

## Verification Checklist

1. `npm install` (picks up turndown)
2. `npm run test:crawl` — runs Stage 2 against test venues
3. Check console output for lightweight vs crawl4ai counts
4. `./docker.sh exec db psql -U postgres -d wedding_venue_finder` — verify `raw_markdown` has `![alt](url)` image syntax
5. Run Stage 3 + 4 downstream to confirm no regressions

---

## Optional Future Enhancement

Add `crawl_method` column (`'lightweight' | 'crawl4ai'`) to track which method was used per venue. Requires a small migration but not necessary for the two-pass functionality itself.
