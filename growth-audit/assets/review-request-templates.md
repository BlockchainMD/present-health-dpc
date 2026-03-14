# Review Request Templates

All templates are HIPAA-safe. They never reference diagnoses, treatments, symptoms, or any Protected Health Information.

---

## Template 1: 30-Day Member Email

**Subject:** How's it going with Present Health?

**Body:**

Hi {first_name},

You've been a Present Health member for about a month now, and we'd love to hear how it's going.

If you've had a good experience so far, a quick Google review helps other people find the kind of care they're looking for. It takes about 60 seconds:

[Leave a Google Review] → {google_review_link}

If something isn't working for you, just reply to this email. We'd rather hear from you directly so we can fix it.

Thank you for trusting us with your care.

— The Present Health Team

---

## Template 2: Post-Care-Episode (Clinician-Initiated via Messaging)

**Sent in secure messaging after a resolved care interaction:**

Glad we could help with that. If you have a moment, a Google review helps other patients discover care like this. No pressure at all — here's the link if you'd like to:

{google_review_link}

---

## Template 3: Post-Welcome-Call Follow-Up (24 hours after)

**Subject:** Thanks for the welcome call, {first_name}

**Body:**

Hi {first_name},

It was great connecting with you yesterday. We're looking forward to being your care team.

One quick ask: if you felt good about the welcome call and what you've seen so far, a brief Google review goes a long way in helping others find Present Health.

[Leave a Google Review] → {google_review_link}

No worries if not — we're just glad you're here.

— The Present Health Team

---

## Template 4: 90-Day Member Check-In

**Subject:** 3 months in — how are we doing?

**Body:**

Hi {first_name},

You've been with Present Health for about three months. We hope the care has been useful.

If you've found value in having a care team you can actually reach, we'd appreciate a quick review. It's the most effective way for other people to find us:

[Leave a Google Review] → {google_review_link}

As always, if there's anything we can do better, just message your care team directly.

— Present Health

---

## Template 5: After Positive Feedback (Triggered by Clinician Tagging)

**Sent when a clinician flags a positive patient comment in messaging:**

**Subject:** You made our day, {first_name}

**Body:**

Hi {first_name},

Your kind words about your experience meant a lot to our team.

If you'd be willing to share that same sentiment publicly, a Google review helps other people find the care they deserve:

[Leave a Google Review] → {google_review_link}

Thank you — truly.

— Present Health

---

## Implementation Notes

1. **Google review link:** Generate from GBP dashboard → "Get more reviews" → copy short link. This opens the review form directly (not just the listing page).

2. **Timing rules:**
   - Only send ONE review request per patient per 90 days
   - Never send during or immediately after a negative interaction
   - Never make the ask feel transactional or conditional on care

3. **HIPAA compliance:**
   - Templates never reference what the patient was seen for
   - Templates never mention diagnoses, medications, symptoms, or treatments
   - Templates never imply the patient is a patient (the email itself going to their address is sufficient)
   - Review responses (separate document) must also never acknowledge medical details

4. **Do NOT gate reviews:**
   - Do not ask "Would you rate us 4 or 5 stars?" before directing to Google
   - Do not route unhappy patients to a private form while routing happy patients to Google
   - This violates Google's policies and FTC guidelines
   - Every patient gets the same ask and the same link

5. **Automation:**
   - Template 1 (30-day) and Template 4 (90-day) can be automated via the existing `AutoResponseTemplate` system
   - Template 2 is clinician-initiated in messaging
   - Template 3 should be triggered after the welcome call is completed
   - Template 5 is triggered manually when a clinician flags positive feedback
