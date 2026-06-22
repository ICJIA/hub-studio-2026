// Faithful (trimmed) copies of live Strapi 5 Content-Manager entities, captured 2026-06-20
// from the dev instance. Used by mapper/repository tests so they verify real shapes, not
// invented ones. Media is populated INLINE (with alternativeText + caption). Relations on
// the entity are { count: N } ONLY — the related items live in the separate relations-endpoint
// fixtures (relApps / relDatasets / relArticles) below.

export const rawArticle = {
  id: 1, documentId: 'igo619j501vpj10sg8ecfv74', legacyId: '5da0c0dd3bb01c36d66f6891', status: 'published',
  title: 'Evaluation of Youth Summer Job Program', slug: 'evaluation-of-youth-summer-job-program',
  date: '2015-08-18', external: false, type: null, hideFromBanner: false,
  categories: ['other'], tags: ['juvenile', 'evaluation', 'prevention'],
  authors: [{ title: 'Jessica Reichert', description: "Manages ICJIA's CJRE." }],
  images: [{ title: 'figure1', src: '/uploads/figure1_fdafcd09e1.png', alt: 'Bar chart of outcomes', caption: 'Figure 1.' }],
  abstract: 'An abstract.', markdown: '# Body\n\n![figure1](/uploads/figure1_fdafcd09e1.png)',
  mainfiletype: 'full report', doi: null, citation: null, funding: null,
  publishedAt: '2026-03-16T18:45:02.898Z', locale: 'en',
  splash: { id: 10, documentId: 'splashdoc', name: 'splash.png', alternativeText: 'Splash alt', caption: null, url: '/uploads/splash_abc.png', width: 1200, height: 630, mime: 'image/png' },
  thumbnail: null,
  mainfile: [
    { id: 11, documentId: 'mfdoc', name: 'report.pdf', alternativeText: null, caption: null, url: '/uploads/report_abc.pdf', mime: 'application/pdf' },
    { id: 12, documentId: 'mfdoc2', name: 'appendix.pdf', alternativeText: null, caption: null, url: '/uploads/appendix_abc.pdf', mime: 'application/pdf' },
  ],
  extrafile: null,
  apps: { count: 0 },
  datasets: { count: 1 },
}

export const rawApp = {
  id: 2, documentId: 'appdoc1', legacyId: 'abc', status: 'published',
  title: 'UCR Index Offense Explorer', slug: 'ucr-index-offense-explorer', date: '2020-01-01', external: false,
  categories: ['crimes'], tags: ['ucr', 'explorer'],
  contributors: [{ title: 'ICJIA R&A staff' }],
  image: { id: 1046, documentId: 'imgdoc', name: 'app-image.png', alternativeText: 'App screenshot', caption: null, url: '/uploads/app_image_22cc0163e1.png', width: 720, height: 342, mime: 'image/png' },
  description: 'Explore UCR data.', url: 'https://example.org/app', citation: null, funding: null,
  publishedAt: '2026-03-16T18:45:02.898Z', locale: 'en',
  datasets: { count: 1 },
  articles: { count: 0 },
}

export const rawDataset = {
  id: 5, documentId: 'dsdoc1', legacyId: 'def', status: 'published',
  title: 'Crime Data', slug: 'crime-data', date: '2021-01-01', external: false, project: false,
  categories: ['crimes'], tags: ['ucr'],
  sources: [{ title: 'UCR, Illinois State Police', url: 'https://isp.illinois.gov/x' }],
  unit: 'county', timeperiod: { yeartype: 'calendar', yearmin: 1982, yearmax: 2020 },
  description: 'County crime counts.',
  notes: ['Counties may not add up to the state total.'],
  variables: [
    { name: 'Year', type: 'integer', definition: 'The year events occurred.' },
    { name: 'id', type: 'int', definition: 'Location identifier.' },
  ],
  citation: null, funding: null, publishedAt: '2026-03-16T18:45:02.898Z', locale: 'en',
  datafile: { id: 99, documentId: 'dfdoc', name: 'crime.csv', alternativeText: null, caption: null, url: '/uploads/crime_abc.csv', mime: 'text/csv' },
  apps: { count: 1 },
  articles: { count: 0 },
}

// --- Relations-endpoint fixtures: GET /content-manager/relations/{uid}/{documentId}/{field} ---
// Items carry documentId + title (NO slug); status/publishedAt/updatedAt are present and ignored.

export const relDatasets = {
  results: [{ id: 5, documentId: 'dsdoc1', title: 'Crime Data', publishedAt: '2026-03-16T18:45:02.898Z', updatedAt: '2026-03-16T18:45:02.898Z', status: 'published' }],
  pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
}

export const relApps = {
  results: [{ id: 2, documentId: 'appdoc1', title: 'UCR Index Offense Explorer', publishedAt: '2026-03-16T18:45:02.898Z', updatedAt: '2026-03-16T18:45:02.898Z', status: 'published' }],
  pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
}

export const relArticles = {
  results: [],
  pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
}
