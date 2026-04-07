# IQsea Intel Brief: Backend Architecture

## 1. Data Persistence (Supabase)
We'll move from local JSON files to **Supabase (PostgreSQL)** to handle:
- **`profiles`**: User auth metadata, names, and contact.
- **`subscriptions`**: Role, specific subjects, modules (Tenders/Prospects), frequency, timezone, and delivery time.
- **`brief_history`**: Archive of generated PDFs and summaries per user.

## 2. The Research Engine (Sonar + Atlas)
- **Trigger:** A cron job runs every 30 minutes, checking `subscriptions` for users whose `delivery_time` (in their local `timezone`) matches the current window.
- **Agent Action (Sonar):** 
  - Takes the 3+ core subjects.
  - Generates deep-search queries.
  - Fetches the latest 24h news/data.
- **Synthesis (Atlas):** 
  - Reviews Sonar's findings.
  - Curates them into the "Intel Brief" format based on the user's role/focus.

## 3. Module Specifics
- **Tender Module:** Parallel search specifically for portal updates in the selected region/type.
- **Client Prospect Module:** Scans for recent B2B moves/signals for the target industries.

## 4. PDF & Email Delivery (Pulse)
- **PDF Generation:** Using `react-pdf` or a headless browser to render the brief into our branded layout.
- **Email Dispatch:** Sending via Resend or SendGrid to the user's registered email.

## 5. Admin Mission Control
- Real-time monitoring of active research runs.
- Success/Failure logs for every brief delivery.
- Ability to manually "Re-run Brief" for a specific user.
