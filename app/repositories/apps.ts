// app/repositories/apps.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { appFromStrapi, appToWrite, type StrapiApp } from '~/lib/mappers/app'
import type { App, AppWrite } from '~/types/content'

export function createAppsRepository(api: $Fetch): Repository<App> {
  return createRepository<StrapiApp, App, AppWrite>({
    api, uid: 'api::app.app', relationFields: ['datasets', 'articles'],
    fromStrapi: appFromStrapi, toWrite: appToWrite,
  })
}
