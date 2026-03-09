interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetOrName: string | Date,
    params?: Record<string, unknown>
  ) => void;
  dataLayer?: Array<unknown>;
}
