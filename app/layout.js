import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// import LoadingProvider from "./components/LoadingProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Compassionate Care Transportation - Booking",
  description: "Accessible transportation for everyone",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png' },
    ],
    shortcut: ['/favicon.png'],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }) {
  // Current timestamp for cache-busting favicons
  const faviconVersion = Date.now();

  return (
    <html lang="en">
      <head>
        {/* Force reload of favicon */}
        <link 
          rel="icon" 
          href={`/favicon.png?v=${faviconVersion}`} 
          type="image/png" 
          sizes="any"
        />
        <link 
          rel="apple-touch-icon" 
          href={`/favicon.png?v=${faviconVersion}`} 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Maps Script - Load globally for all pages */}
        {/* Define callback function BEFORE loading the API */}
        <Script id="google-maps-init" strategy="beforeInteractive">
          {`
            window.initGoogleMapsGlobal = function() {
              console.log('🗺️ Google Maps global callback fired');
              window.googleMapsLoaded = true;
              window.dispatchEvent(new CustomEvent('googleMapsReady'));
            };
            window.googleMapsLoaded = false;
          `}
        </Script>
        
        <Script
          id="google-maps"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsGlobal`}
          strategy="lazyOnload"
        />
        
        {children}
      </body>
    </html>
  );
}
