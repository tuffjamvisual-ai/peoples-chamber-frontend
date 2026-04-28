/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.thepeopleschamber.uk',
  generateRobotsTxt: true,
  // Public-facing static + dynamic routes are auto-discovered from the
  // .next/server build output. We exclude API routes and a few internal
  // helpers that aren't meant to be indexed.
  exclude: [
    '/api/*',
    '/_*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    additionalSitemaps: [
      'https://www.thepeopleschamber.uk/sitemap.xml',
    ],
  },
  // Sane defaults for changefreq/priority so search engines have hints
  // without us pretending each page changes hourly.
  changefreq: 'daily',
  priority: 0.7,
}
