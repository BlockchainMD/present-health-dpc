'use client';

import { useEffect } from 'react';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

export function TrackJoinClick() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href="/join"]');
      if (anchor?.dataset.bookChoiceLink === 'true') return;
      if (anchor) {
        trackEvent({
          eventType: AnalyticsEvents.JOIN_CLICK,
          path: window.location.pathname,
          metadata: { label: anchor.textContent?.trim() || 'join' },
        });
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
