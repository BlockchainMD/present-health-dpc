import Script from 'next/script';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export function GA4Script() {
  if (!GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:true});`}
      </Script>
    </>
  );
}
