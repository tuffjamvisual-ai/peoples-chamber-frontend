'use client';

// PostHog (EU Cloud) page by page tracking, loaded ONLY after a visitor accepts additional cookies (owner's approval,
// 29 Oct 2026). Until then posthog-js is not even downloaded. Pageviews and pageleaves only: no autocapture, session
// recording or surveys; never identify, so no person profile and no name or email is sent. Every URL property loses its
// query string and hash before sending, so no reset token, email or search term leaves the browser in a URL; nothing is
// sent from /admin, /internal, /account or /reset-password. If the visitor later rejects, capturing stops and every ph_*
// cookie and storage key is deleted. Vercel Web Analytics and Speed Insights are separate and unchanged.
// Since 3 Nov 2026 (owner's brief): events go through the site's own /ingest path (rewrites in next.config.ts, EU
// region), and one custom event, "search" (app/search/SearchTracker.tsx), sends the submitted query with any email
// address or UK postcode removed (lib/search-analytics.ts), through captureEvent below, under the same consent check.
import { useEffect } from 'react';
import type { PostHog, CaptureResult } from 'posthog-js';
import { CONSENT_EVENT, readConsent, clearAnalyticsStorage, type ConsentPolicy } from '@/lib/cookie-consent';

const EXCLUDED = /^\/(admin|internal|account|reset-password)(\/|$)/;
const URL_KEYS = [
  '$current_url', '$pathname', '$referrer', '$initial_referrer', '$initial_current_url', '$initial_pathname',
  '$prev_pageview_pathname', '$session_entry_url', '$session_entry_referrer', '$session_entry_pathname',
];

const withoutQuery = (v: unknown) => (typeof v === 'string' ? v.split('#')[0].split('?')[0] : v);
function scrub(obj: Record<string, unknown> | undefined | null) {
  if (!obj) return;
  for (const k of URL_KEYS) if (k in obj) obj[k] = withoutQuery(obj[k]);
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  // Nothing is sent unless the consent cookie says yes at the moment of sending: PostHog's own opt out alone still let a
  // $pageleave through when a visitor said No on /cookies and then left the page (tested 29 Oct 2026).
  if (!event || readConsent()?.analytics !== true || EXCLUDED.test(window.location.pathname)) return null;
  const props = event.properties as Record<string, unknown> | undefined;
  scrub(props);
  scrub(props?.$set as Record<string, unknown> | undefined);
  scrub(props?.$set_once as Record<string, unknown> | undefined);
  scrub(event.$set as Record<string, unknown> | undefined);
  scrub(event.$set_once as Record<string, unknown> | undefined);
  return event;
}

let client: PostHog | null = null;
let loading: Promise<void> | null = null;

// PostHog's EU app, for links from the toolbar (the events themselves go through /ingest, next.config.ts).
const UI_HOST = 'https://eu.posthog.com';

function start() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  if (client) {
    client.opt_in_capturing();
    return;
  }
  if (loading) return;
  // A visitor who rejected before and now accepts: PostHog's old opt out marker would keep it silent.
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith('__ph_opt_in_out_')) window.localStorage.removeItem(k);
  } catch {
    // Storage unavailable; PostHog then keeps no marker either.
  }
  loading = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: UI_HOST,
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      // No feature flags are used, so PostHog never calls its flags endpoint (also not after a reset on reject).
      advanced_disable_flags: true,
      before_send: beforeSend,
    });
    client = posthog;
  });
}

// A custom event, sent only while the visitor has accepted additional cookies (before_send checks again at sending). If
// PostHog has not started yet on this page but consent is given, it is started first; without consent nothing happens.
export function captureEvent(name: string, properties: Record<string, unknown>) {
  if (readConsent()?.analytics !== true) return;
  const send = () => { if (client && readConsent()?.analytics === true) client.capture(name, properties); };
  if (client) { send(); return; }
  if (!loading) start();
  loading?.then(send);
}

function stop() {
  // Rejected while PostHog was still loading: stop it as soon as it is ready.
  if (!client && loading) loading.then(() => { if (!readConsent()?.analytics) stop(); });
  if (client) {
    client.opt_out_capturing();
    client.reset();
  }
  clearAnalyticsStorage();
}

export default function PostHogLoader() {
  useEffect(() => {
    if (readConsent()?.analytics) start();
    const onChoice = (e: Event) => ((e as CustomEvent<ConsentPolicy>).detail?.analytics ? start() : stop());
    window.addEventListener(CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(CONSENT_EVENT, onChoice);
  }, []);
  return null;
}
