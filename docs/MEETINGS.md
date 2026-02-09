# Project: Wedding Venue Discovery Platform

## Initial Brainstorm: "Tinder for Venues"
The core concept is to simplify [[Venue]] discovery through a high-frequency, low-friction interaction model.

* **The Swipe Mechanic:** Users swipe right to "save for later" and left to reject.
* **Recommendation Engine:** A [[Learning Algorithm]] tracks swipes to refine user preferences.
* **The Shortlist:** Users curate a focused list of venues for deeper inquiry, rather than being overwhelmed by hundreds of options.
* **In-App Communication:** * Include [[Pricing Transparency]] where possible.
    * **Beta Phase:** Provide an [[Outreach Template]] for inquiries.
    * **In-App Emailing:** Allow users to customize a template and batch-send inquiries to their entire shortlist with one click.

---

## Meeting 1: Defining the MVP Vision
**Objective:** Create a comprehensive wedding planning platform that captures couples' specific tastes rather than just displaying sponsored listings.

### MVP Scope
* **Initial Launch:** Focus specifically on the [[Los Angeles]] area to ensure a diverse dataset for testing.
* **Core Goal:** Establish a "Taste Profile" rather than a standard search filter.

### Key Features

#### 1. Taste Profile System
* **The 10-Swipe Hook:** Users perform ~10 initial swipes on venue photos to establish an aesthetic baseline.
* **AI Summary:** [[Artificial Intelligence]] generates a summary of 5 descriptive words (e.g., "Moody," "Elegant," "Vintage") based on the swipes.
* **Refinement:** Users can confirm the profile or request more swipes to improve accuracy, avoiding the "best of four bad options" trap found in traditional quizzes.

#### 2. Search & Filtering
* **Metadata Filters:** Traditional search parameters including budget, location, accommodations, proximity to [[Airports]], and square footage.
* **Taste-Based Ranking:** Search results are ranked by relevance to the user's [[Taste Profile]].
* **Sorting Options:** Price, recommendations, and custom ranking.

#### 3. Technical Requirements
* **Data Pipeline:** A system to identify and scrape/ingest candidate venues within a defined radius.
* **Profiling Algorithm:** The backend logic to translate swipes into a vector-based taste profile.
* **Structured Metadata:** Ensuring all venues have consistent [[Metadata]] for apples-to-apples comparison.

---

## Strategic Considerations
* **Ceremony vs. Reception:** Handling preferences for users looking for separate or combined locations.
* **Visual Variety:** Utilizing multiple photos per venue to represent different spaces (e.g., ballroom vs. garden).
* **The Bubble Problem:** Intentionally introducing variety into the feed to avoid creating a [[Recommendation Engine]] "bubble" that limits discovery.
* **Pricing:** Solving the industry-wide issue of hidden venue costs.


# Meeting 2: Feature Expansion & Social Integration

**Objective:** Refine the "Tinder for Venues" core loop and explore social/content integration to differentiate the platform from traditional directories.

### Core Mechanic Refinements
* **Dual-Path Discovery:** Maintain a "Classic Search" feature as a fallback for users who prefer traditional filtering over the swipe-based interface.
* **Dynamic Profile Management:** * User "likes" are stored in a dedicated profile section.
    * **Active Learning:** The recommendation engine must update in real-time when users remove items from their saved list, treating "unsaves" as negative feedback.
    * **"More Like This":** Each saved venue generates a sub-feed of similar aesthetic matches to deepen discovery.

### "Insta-Maps" & Content Integration
* **Social Proofing:** Implement a feature that pulls Instagram and TikTok content tagged at specific venues.
* **UX Consideration:** Determine whether to play videos natively within the app (for retention) or deep-link to the original social platform (for authenticity).

### Wedding Social Media Strategy
* **Lifecycle Filtering:** Users can filter content by their current stage (e.g., stop seeing engagement/proposal content once the user has moved into the "active planning" stage).
* **Platform Philosophy:** Strict **"No Ads"** policy to maintain user trust and avoid the cluttered feel of legacy wedding sites.

### MVP & Premium Roadmap
* **MVP Core:** Remain focused on the "Tinder for Venues" swipe-to-match functionality.
* **Premium Feature Concept:** * **Pinterest Sync:** Allow users to import their Pinterest boards.
    * **AI Analysis:** Use the imported imagery to automatically generate a list of venues that match the user's existing visual inspiration.
