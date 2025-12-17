# Search Ads + Landing Page Experimentation System

This system allows for the safe, compliant, and rapid deployment of Google Search Ads and corresponding Landing Pages for Present Health.

## Features

-   **Safe Mode**: Strict compliance denylist blocks forbidden terms (Rx, meds, etc.).
-   **Admin Dashboard**: Full lifecycle management (Create, Validate, Generate, Deploy).
-   **Landing Page Generator**: Creates idempotent, optimized landing pages at `/lp/[slug]`.
-   **Asset Generator**: Automatically creates Keywords and RSA (Responsive Search Ad) assets.

## Getting Started

### 1. Access the Admin Dashboard
Navigate to `/admin/campaigns`.
-   **List View**: See all campaigns and their status.
-   **New Campaign**: Create a new campaign spec.

### 2. Create a Campaign
1.  Click **New Campaign**.
2.  Fill in the **Persona** and **Intent**.
3.  Add **Seed Keywords** (e.g., "urgent care", "same day doctor").
4.  **Compliance Check**: The system will automatically block any forbidden terms.

### 3. Generate Assets
1.  Go to the **Campaign Details** page.
2.  Click **Generate Assets**.
3.  The system will:
    -   Generate a Landing Page at `/lp/<landing-slug>`.
    -   Generate Phrase/Exact match keywords.
    -   Generate RSA Headlines and Descriptions.
4.  Review the generated assets in the preview tabs.

### 4. View Landing Page
Click the **View Live** button on the Campaign Details page to see the generated landing page.

## CLI Usage (For Developers)

You can use the `adsgen` script to validate specs and generate assets from the command line.

**Prerequisite**: Install `tsx` if not already installed (or use `npx tsx`).

```bash
# Validate a JSON spec
npx tsx scripts/adsgen.ts validate --spec examples/campaign-spec.json

# Generate assets (Dry Run)
npx tsx scripts/adsgen.ts generate --spec examples/campaign-spec.json
```

## Example Spec JSON

```json
{
  "slug": "busy-mom-urgent",
  "persona": "Busy Mom",
  "intent": "Sick child needs same-day care",
  "landingSlug": "urgent-care-mom",
  "seedKeywords": ["pediatric urgent care", "same day pediatrician"],
  "benefits": ["No waiting rooms", "Text your doctor"],
  "proofPoints": ["Board-certified", "5-star rated"],
  "disclaimers": []
}
```
