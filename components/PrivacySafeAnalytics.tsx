"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { safeAnalyticsUrl } from "@/lib/analytics-url";

export default function PrivacySafeAnalytics() {
  return (
    <><Analytics
      beforeSend={(event) => {
        const url = safeAnalyticsUrl(event.url);
        return url ? { ...event, url } : null;
      }}
    /><SpeedInsights beforeSend={(event) => { const url = safeAnalyticsUrl(event.url); return url ? { ...event, url } : null; }} /></>
  );
}
