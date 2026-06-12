'use client';

export const AnalyticsEvents = {
  LEAD_CAPTURE: 'LEAD_CAPTURE',
  ASSESSMENT_START: 'ASSESSMENT_START',
  ASSESSMENT_COMPLETE: 'ASSESSMENT_COMPLETE',
  JOIN_CLICK: 'JOIN_CLICK',
  VISIT_PATH_CLICK: 'VISIT_PATH_CLICK',
  REGISTER: 'REGISTER',
} as const;

const GA4_EVENT_MAP: Record<string, string> = {
  LEAD_CAPTURE: 'generate_lead',
  ASSESSMENT_START: 'assessment_start',
  ASSESSMENT_COMPLETE: 'assessment_complete',
  JOIN_CLICK: 'join_click',
  VISIT_PATH_CLICK: 'select_content',
  REGISTER: 'sign_up',
};

type EventPayload = {
  eventType: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export function trackEvent(payload: EventPayload) {
  // 1. Native beacon to /api/analytics/event
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/analytics/event', blob)) {
        // sent
      } else {
        void fetch('/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
          credentials: 'same-origin',
        });
      }
    } else {
      void fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      });
    }
  } catch {
    // no-op
  }

  // 2. GA4 dataLayer push (no-ops if gtag not loaded)
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      const ga4Name = GA4_EVENT_MAP[payload.eventType] || payload.eventType.toLowerCase();
      window.gtag('event', ga4Name, {
        event_category: payload.metadata?.category as string | undefined,
        event_label: payload.metadata?.label as string | undefined,
        page_path: payload.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        ...payload.metadata,
      });
    }
  } catch {
    // no-op
  }
}
