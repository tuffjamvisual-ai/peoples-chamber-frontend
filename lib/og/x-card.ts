// The small X card (owner, Cowork ENTRY 418, 20 Nov 2026: "try the SMALL X card"): every page sets twitter:card to
// 'summary' (X shows a small square image with the page's title and description as text beside it) and one square
// twitter:image, the straight OPENGOVT.UK stamp centred on the folder colour (public/og/x-square.png, 800 x 800, drawn
// by the share cards' own stamp, lib/og/stamp.tsx, the same picture as the X profile picture). og:image stays the large
// 1200 x 630 cards for Facebook, LinkedIn, WhatsApp and others.

export const X_CARD = 'summary' as const;
export const X_SQUARE_IMAGE = { url: 'https://www.opengovt.uk/og/x-square.png', width: 800, height: 800, alt: 'opengovt.uk' };
