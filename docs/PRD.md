# Product Requirements Document (PRD): Venue Intelligence Engine v2.0

**Product:** California Venue Intelligence Engine (The “Slot 1” & “Slot 2” MVP)  
**Version:** 2.0 (Post-Competitor Analysis Revision)  
**Status:** Draft  
**Target Market:** California (Initial Launch), with architectural hooks for Texas / Nashville / New York

---

## 1. Executive Summary

Following a strategic audit of Breezit, we have identified a significant **Trust Gap** and **Inventory Blind Spot** in the market. While Breezit offers transparency, it relies on static estimates and manual concierges, leading to pricing discrepancies and high operational friction. `11111111`

This revised MVP pivots from a general directory to a **high-fidelity logistics engine**. We will specifically target the **“Wedding Weekend”** segment—a high-value whitespace Breezit ignores—by focusing on **Private Estates** and **Overnight Capacity**. `222222222`

Our technical moat is an **API-first / local AI pipeline** that delivers real-time **“Logistical Truths”** rather than the **“Transparency Mirage”** of competitors. `3333`

---

## 2. Updated User Stories (The “Breezit-Killer” Features)

| Actor | Action | Goal | Enabler (Tech Component) |
|------|--------|------|---------------------------|
| User | Filter by “Sleeps 20+ Guests” | Locate a “Wedding Weekend” estate where the bridal party can stay | Phi-3 Mini extracting `lodging_capacity` from text `4444` |
| User | View “Verified” Pricing | Avoid the “Bait & Switch” of estimated ranges | API integration (Tripleseat/HoneyBook) or Phi-3 deep-parsing PDF rate cards `555` |
| User | Filter by “Weekend Buyout” | Find venues that allow 48-hour exclusive access | Phi-3 Mini identifying “buyout” or “multi-day” keywords `6` |
| User | Use “Anti-Hallucination” Data | Trust that the venue actually exists and has the features listed | OSM verification + CLIP image validation to prevent “Ghost Listings” `7777` |

---

## 3. Technical Architecture: The “High-Fidelity” Pipeline

### Phase 1: Discovery & Geographic Arbitrage

- **Source:** OpenStreetMap (Overpass API)
- **Expansion Logic:** While the MVP is California-exclusive, the pipeline will include tags for Texas Hill Country and Tennessee to prepare for rapid geographic arbitrage where Breezit has no presence. `8888`
- **Targeting:** Explicitly prioritize `historic=manor`, `tourism=guest_house`, and `place=estate` to capture the underserved “Airbnb for Weddings” niche. `9999`

### Phase 2: Fetching (Crawl4AI)

- **New Priority:** Instead of just homepages, the scraper must prioritize **PDF extraction** (packages / contracts).
- This is where real-time pricing truth is often hidden, allowing us to beat Breezit’s algorithmic estimates. `10101010`

### Phase 3: Text Enrichment (The Logistics Brain)

- **Model:** Phi-3 Mini (3.8B), 4-bit quantized
- **Workflow Update: Strict JSON Extraction**
  - `overnight_capacity` (int): Crucial gap in Breezit’s filter taxonomy `11`
  - `kitchen_amenities` (bool): Necessary for estate-style multi-day stays `12`
  - `is_negotiable` (bool): Identify venues open to haggling to compete with Breezit’s “Negotiable” branding `13`
  - `real_time_source` (bool): Flag if the data comes from a live API vs. a static scrape `141414`

### Phase 4: Image Enrichment (The “Vibe” Filter)

- **CLIP / Moondream2:** Focus on identifying lodging facilities (bedrooms, suites) and outdoor ceremony spaces `151515`
- **Anti-Stock Filter:** Delete generic “wedding cake” or “rings” photos to ensure users only see the actual physical property and its sleeping quarters `16`

---

## 4. Competitive Data Dictionary (Target Schema)

| Field Name | Type | Strategic Logic |
|-----------|------|-----------------|
| `lodging_capacity` | Int | Primary differentiator. Breezit lacks this structured filter. `171717` |
| `buyout_rate` | Currency | Targets the high-AOV “Destination Weekend” segment ($20k–$50k). `1818` |
| `api_integrated` | Bool | Defines data “Trust Level.” Higher trust than Breezit estimates. `191919` |
| `is_estate_private` | Bool | Specifically targets the “Airbnb for Weddings” slot. `20202020` |
| `last_verified_at` | DateTime | Combats the “Stale Data” issue inherent in Breezit’s model. `21` |

---

## 5. Implementation Roadmap (4 Weeks)

- **Week 1 (The Estate Fetcher):** Build the scraper specifically for California private estates and manors.
- **Week 2 (The Logistics Brain):** Fine-tune Phi-3 prompts to focus on beds, baths, and buyout rules rather than general vibes. `22`
- **Week 3 (The Trust Engine):** Build initial API connectors for Tripleseat or HoneyBook to test live availability. `23`
- **Week 4 (The “Weekend” UI):** Launch a frontend that prioritizes “Stay + Event” search results.

---

## 6. Key Strategic Risks & Mitigations

- **Disintermediation:** Like Breezit, venues may try to bypass our fees. `24`  
  **Mitigation:** Use a moderate commission (10–15%) + subscription model. By being vendor-friendly and providing property management tools (room blocks), we reduce the incentive to cheat. `252525`

- **Unit Economics:** Breezit’s human concierge model is expensive and scales linearly. `26`  
  **Mitigation:** Pursue a high-scalability model. Ensure the platform is ~90% self-service via AI and API-driven real-time booking. `27`

- **The “Transparency Mirage”:** If our AI extracts a wrong price, we lose trust like Breezit. `28`  
  **Mitigation:** Clearly label data as “AI-Extracted” vs. “API-Verified” to maintain intellectual honesty and trust. `29`

