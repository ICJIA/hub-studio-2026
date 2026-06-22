// Valid-shaped empty domain models seeding the create forms. Every field is present so the
// reactive form binds cleanly and the validators (which assume the full shape) run correctly.
import type { Article, App, Dataset } from '~/types/content'

export function blankArticle(): Article {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    type: null, hideFromBanner: false, authors: [], abstract: null, markdown: '',
    splash: null, thumbnail: null, images: [], mainfiletype: 'PDF',
    mainfiles: [], extrafile: null, doi: null, apps: [], datasets: [],
  }
}

export function blankApp(): App {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    contributors: [], image: null, description: null, url: null, datasets: [], articles: [],
  }
}

export function blankDataset(): Dataset {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    project: false, sources: [], unit: null, timeperiod: null, description: null,
    notes: [], variables: [], datafile: null, apps: [], articles: [],
  }
}
