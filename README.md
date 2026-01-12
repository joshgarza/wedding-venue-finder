# Wedding Venue Finder

- Collect candidates (free sources)
	- Pull places from OpenStreetMap/Overpass within California (name + lat/lng + any address/website tags).
	- Optionally scrape 2–5 big venue directories for extra coverage (name + city + listing URL).
	- Fill in missing websites for each relevant candidate
	- Grab photos from the web

- Store raw + canonical records
	- A table/JSON for raw candidates (what you found, where you found it).
	- A table/JSON for canonical venues (deduped “final” entities).

- Normalize fields
	- Standardize venue name (case, punctuation).
	- Standardize location (city/county when possible; otherwise lat/lng only).
	- Extract website domain when present.

- Deduplicate / merge
	- Merge candidates into a single venue using:
		- website domain match (best),
		- else name similarity + geo proximity.

- Basic “is this actually a venue?” filter
	- Keep/drop using simple rules:
		- venue-ish keywords in name, and/or
		- has a website (optional: quick homepage keyword check).

- Export for personal search
	- Output CSV (and optionally JSON) with:
		- name, website, address/city/county, lat/lng, source(s)
	- Designed to be filtered/sorted in Google Sheets/Airtable.

