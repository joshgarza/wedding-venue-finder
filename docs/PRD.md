Based on your decision to pursue the **Local LLM/VLM Enrichment Pipeline**, I have drafted a comprehensive Product Requirements Document (PRD) for your MVP.

This PRD is tailored for a **California-exclusive launch**, optimizing for "non-impressive" hardware (consumer laptop/CPU-only inference) while maintaining high data fidelity.

---

# Product Requirements Document (PRD)

**Product:** California Venue Intelligence Engine (MVP)
**Version:** 1.0 (Local Stack Prototype)
**Status:** Draft
**Target Market:** California (CA)

## 1. Executive Summary

This MVP aims to validate a "Data-First" wedding venue discovery platform that surpasses incumbent directories (The Knot, WeddingWire) by offering granular, verified filtering capabilities. Unlike competitors that rely on vendor-submitted checkboxes, this product will use a **Local LLM/VLM Pipeline** to autonomously fetch, read, and structure data from venue websites.

The core value proposition is the ability to filter by **"Logistical Truths"** rather than "Marketing Tags"—specifically targeting the underserved niche of **Private Estates**, **Overnight Capacity**, and **Historic Status**.

## 2. User Stories (MVP)

| Actor | Action | Goal | Enabler (Tech Component) |
| --- | --- | --- | --- |
| **User** | Filter by "Sleeps 20+ Guests" | Find a venue for a multi-day wedding weekend. | **Phi-3 Mini** extracting `accommodation_capacity` from text. |
| **User** | Filter by "Private Estate" | Avoid ballrooms/hotels; ensure privacy. | **Phi-3 Mini** analyzing "About Us" text for keywords (exclusive use, private home). |
| **User** | View "Real" Photos | See the venue without logos/floorplans mixed in. | **CLIP** filtering out non-venue images; **Moondream2** captioning relevant ones. |
| **User** | See Price Estimate | Get a rough budget (`$$`, `$$$`) without emailing. | **Phi-3 Mini** extracting pricing from "Packages" pages or PDFs. |

## 3. Technical Architecture: The "Local Stack" Pipeline

**Hardware Constraints:** Standard Consumer Laptop (e.g., 16GB RAM, 4-Core CPU).
**Throughput Goal:** ~2,000 venues processed per week (background batch processing).

### Phase 1: Discovery (The Seed)

**Source:** OpenStreetMap (Overpass API)
**Geofence:** California Bounding Box
**Logic:**

1. Query Overpass for nodes/ways/relations with tags:
* `amenity=events_venue`
* `leisure=resort` AND `booking:wedding=yes` (if available)
* `historic=manor` / `historic=castle`
* `building=public` AND `name` contains "Estate", "Garden", "Ranch", "Vineyard"


2. **Output:** JSON list of `Candidate_Venues` (Name, Lat/Lon, Website URL).
* *Note:* If OSM lacks a URL, the item is discarded for MVP (to save cost/complexity of adding a Search API).



### Phase 2: Fetching (The Scraper)

**Tool:** `Crawl4AI` (Python)
**Configuration:**

* **Mode:** `Markdown Generation` (Converts HTML to clean text for the LLM).
* **Strategy:** Breadth-First.
* Fetch `Homepage`.
* Look for internal links matching keywords: `/weddings`, `/events`, `/pricing`, `/accommodations`, `/gallery`, `/history`.
* Fetch max 3 sub-pages per venue.


* **Media Extraction:** Download all images > 50KB to a temporary local folder.

### Phase 3: Text Enrichment (The Brain)

**Model:** **Microsoft Phi-3 Mini (3.8B Parameters) 4-bit Quantized**
**Runner:** `Ollama` or `llama.cpp` (Python bindings)
**Context Window:** 128k (Crucial for reading long "Terms & Conditions" pages).
**Workflow:**

1. Concatenate Markdown from Homepage + Weddings Page + Pricing Page.
2. **Prompt Engineering:**
> "You are a data extraction agent. Read the following text describing a venue. Extract these fields into a strict JSON format. If specific data is missing, return null. Do not hallucinate."
> * `is_estate` (bool): True if venue is a private home, manor, or exclusive ranch.
> * `is_historic` (bool): True if text mentions "historic", "century", "built in 1XXX".
> * `allows_overnight` (bool): True if text mentions "lodging", "rooms", "suites", "sleeps".
> * `overnight_capacity` (int): Max number of guests that can sleep on-site.
> * `price_range` (enum): "Low" (<$5k), "Mid" ($5k-$15k), "High" ($15k+). Derived from any found dollar signs associated with "rental fee" or "packages".
> 
> 



### Phase 4: Image Enrichment (The Eyes)

**Pipeline:** Two-Stage Filter

1. **Filtering (CLIP ViT-B/32):**
* **Input:** All downloaded images.
* **Prompts:** "A wedding venue", "A scenic landscape", "A dining room" VS. "A floorplan", "A logo", "A close-up of food", "A screenshot", "Text".
* **Action:** If similarity to negative prompts > positive prompts, **DELETE** file.


2. **Captioning (Moondream2):**
* **Input:** Top 5 surviving images.
* **Prompt:** "Describe this image. Is it indoor or outdoor? distinct features?"
* **Output:** Tags stored in DB (e.g., `["outdoor", "garden", "sunset", "ocean_view"]`).



## 4. Data Dictionary (Target Schema)

| Field Name | Type | Source | Logic/Prompt Note |
| --- | --- | --- | --- |
| `venue_id` | UUID | System | Primary Key |
| `name` | String | OSM | Fallback to `<title>` tag if OSM name is generic |
| `location_lat_long` | Point | OSM | Used for map view |
| `website_url` | String | OSM | Source of truth |
| `is_active` | Bool | Crawler | False if 404/DNS error |
| `venue_type` | Enum | **Phi-3** |  |
| `has_lodging` | Bool | **Phi-3** | Keyword trigger: "Suite", "Sleeps", "Accommodation" |
| `lodging_capacity` | Int | **Phi-3** | "Sleeps X", "X rooms" (Assume 2 ppl/room if only room count given) |
| `is_historic` | Bool | **Phi-3** | Mentions of dates <1970 or "Historic Landmark" |
| `pricing_tier` | Int (1-4) | **Phi-3** | Heuristic based on extracted currency values |
| `image_urls` | Array | **CLIP** | List of local paths or S3 URLs of *verified* venue photos |
| `image_tags` | JSON | **Moon** | `{img_1: ["outdoor", "ceremony"], img_2: ["ballroom"]}` |

## 5. Implementation Roadmap (4 Weeks)

### Week 1: The "Fetcher" (Python)

* Set up Postgres DB with PostGIS (for California geo-queries).
* Write script to query Overpass API for California nodes.
* Implement `Crawl4AI` to visit URLs and save Markdown + Images to disk.
* **Goal:** A folder with 100 venue subfolders containing `content.md` and `/images/`.

### Week 2: The "Text Brain" (Phi-3)

* Install Ollama + Phi-3 Mini.
* Write Python wrapper (`langchain` or raw `requests`) to feed `content.md` to Phi-3.
* **Critical Task:** Refine the System Prompt to output valid JSON. Implement a "Retry" loop if JSON is malformed.
* **Goal:** Populate DB with `is_estate`, `has_lodging`, and `capacity`.

### Week 3: The "Visual Eye" (CLIP/Moondream)

* Install `transformers` and `torch` (CPU optimized).
* Write script to iterate through image folders.
* Implement CLIP to delete "garbage" (logos, pdf screenshots).
* Implement Moondream2 to tag the "Hero Image".
* **Goal:** Each venue in DB has 1-5 high-quality, verified photo references.

### Week 4: The UI & Review

* Simple Frontend (Next.js/Streamlit).
* Map view of California.
* Filters: Toggle "Estate Only", Slider "Sleeps 10+", Toggle "Historic".
* **Manual QA:** Manually check 50 venues to verify if Phi-3 was accurate. Adjust prompts.

## 6. Known Limitations & Risks

1. **Hallucinations:** Phi-3 is a small model. It might see "Built in 2020 in a historic style" and tag it as `is_historic`.
* *Mitigation:* Use "Few-Shot Prompting" (give it 3 examples of correct extraction in the prompt).


2. **Compute Time:** Moondream2 on CPU takes ~3-5 seconds per image. 10 images/venue = 50 seconds.
* *Mitigation:* Only analyze the first 5 images found. Run the script overnight.


3. **California Legal (CCPA):**
* *Compliance:* Stick to **Business Data** (B2B). Do not scrape personal blogs or photographer portfolios where individuals are named/pictured without consent. Focus on the venue's commercial existence.


4. **Bot Detection:** `Crawl4AI` is good, but some venues use Cloudflare.
* *MVP Decision:* Skip protected sites. There is enough "low hanging fruit" (custom Wordpress/Squarespace sites) to fill the database without fighting distinct anti-bot measures.

