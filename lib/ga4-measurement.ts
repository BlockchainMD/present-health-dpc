const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

const CONVERSION_TYPE_TO_GA4: Record<string, string> = {
  LEAD_CREATED: 'generate_lead',
  REGISTERED: 'sign_up',
  CHECKOUT_STARTED: 'begin_checkout',
  CHECKOUT_COMPLETED: 'purchase',
  SUBSCRIPTION_STARTED: 'subscription_start',
  CONSULTATION_BOOKED: 'consultation_booked',
  SINGLE_VISIT_REQUESTED: 'generate_lead',
  ASSESSMENT_COMPLETED: 'assessment_complete',
  ASSESSMENT_LEAD_CAPTURED: 'assessment_lead_captured',
};

export function sendGA4ServerEvent(
  conversionType: string,
  params?: Record<string, unknown>
) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;

  const ga4EventName = CONVERSION_TYPE_TO_GA4[conversionType] || conversionType.toLowerCase();

  const body = JSON.stringify({
    client_id: (params?.clientId as string) || `server.${Date.now()}`,
    events: [
      {
        name: ga4EventName,
        params: {
          engagement_time_msec: '100',
          session_id: (params?.sessionId as string) || undefined,
          lead_id: (params?.leadId as string) || undefined,
          user_id: (params?.userId as string) || undefined,
          ...params,
          // Remove non-GA4 fields
          clientId: undefined,
        },
      },
    ],
  });

  const url = `${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

  // Fire-and-forget
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch((err) => {
    console.error('[GA4 MP] Failed to send event:', err);
  });
}
