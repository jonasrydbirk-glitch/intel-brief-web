# Intel Brief: Onboarding Questionnaire & Reporting Logic

## Flow Overview
The user arrives at the landing page and is prompted to build their intelligence profile. The questionnaire uses open-ended inputs with clear examples to allow for AI-driven analysis of their niche needs.

## 1. Professional Identity
- **Intent:** Determine the user's role and "voice" for the report.
- **Input:** Open text with examples.
- **Examples:** "Ship Owner/Operator", "Maritime Lawyer", "Bunker Trader", "Technical Manager".

## 2. Asset & Market Focus
- **Intent:** Identify what physical assets or markets need tracking.
- **Input:** Open text (allow multiple).
- **Examples:** "LPG and LNG Carriers", "Capesize Bulkers", "The whole container market", "Middle East Bunker ports".

## 3. Core Intelligence Subjects (The "Must-Haves")
Users provide at least 3 subjects. We analyze these and then "fill in the blanks" using profession-based lookups (e.g., if they are a Technical Manager, we might suggest Engine efficiency or Spares logistics if they didn't list them).
- **Subject 1:** (e.g., "IMO 2024 compliance updates")
- **Subject 2:** (e.g., "Daily charter rates for Supramax")
- **Subject 3:** (e.g., "Port congestion at Singapore and Port Klang")
- **Examples:** "Latest IMO news and regulation updates", "Daily bunker prices in Rotterdam", "Suez Canal transit alerts".

## 4. Advanced Modules (Opt-in)
Users can toggle specific high-value modules based on their needs:

### A. Tender Module
- **Intent:** Tracking new tender opportunities.
- **Input 1:** Region/Focus Area (e.g. "SE Asia", "Middle East").
- **Input 2:** Tender Type (e.g. "Public Tenders", "Offshore Wind", "Port Services").

### B. Client Prospect Module
- **Intent:** Lead generation/B2B outreach.
- **Input 1:** Quantity (1, 2, 3, 4, 5).
- **Input 2:** Focus Area/Regions (e.g. "Singapore Ship Management companies").

### D. Competitor Tracker
- **Intent:** Monitoring rival activity and announcements.
- **Input:** Toggle ON + Text Box for company names.
- **Example:** "Wärtsilä", "MAN Energy Solutions", "Alfa Laval".
- **Tone:** Technical, professional maritime English.

### E. Vessel Arrivals (Under Construction)
- **Intent:** High-precision tracking of incoming port traffic.
- **Status:** Displayed as "Under Construction" in UI.
- **Input:** Toggle ON + 3 Dropdowns (Port, Vessel Type, Timeframe).
- **Commentary:** Restricted to purely factual ETA/Type data only. No strategic speculation.

- **Frequency Options:** 
  - Business Days (Mon-Fri)
  - 3x Week (Mon, Wed, Fri) - Recommended for Deep Dives.
  - Weekly
- **Timing & Localization:**
  - User-selected Timezone (default to auto-detect).
  - User-selected Delivery Time (e.g., 08:00, 13:00, 18:00).
- **Depth Options:** Executive Summary (1min), Deep Dive (5min), Data-only.

## 5. Monthly Advanced Report
- **Content:** Aggregated major trends and historical shifts.
- **User input prompted during onboarding:** "What would you like to see in your monthly strategic review?"
- **Examples:** "Updated sanction lists", "Global scrapping stats for 2026", "New build order book trends".

## Delivery
- **Primary:** Email-first.
- **Secondary:** Web Dashboard for historical archive and deep-drills.
