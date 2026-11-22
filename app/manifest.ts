// The web app manifest (Cowork ENTRY 507, owner approved a demo, 22 Nov 2026): opengovt can be added to a phone's home
// screen and opens without the browser's bars. No service worker and no offline copy: every page is read live, as on the
// web. Colours from the site: the phone header bar (#d9b97f) and the app icon's cream (#fbf4e6). Icons: the header
// wordmark stamp in Bebas Neue, made from HTML like apple-icon.png (public/app/; the maskable one keeps the stamp inside
// the central safe circle).
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'opengovt',
    short_name: 'opengovt',
    description: 'Independent UK Parliament tracker and government transparency record.',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbf4e6',
    theme_color: '#d9b97f',
    icons: [
      { src: '/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
