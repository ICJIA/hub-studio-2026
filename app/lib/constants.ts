// Single source of truth for the app name lives in studio.config.ts (repo root).
// Re-exported here so existing consumers (`import { APP_NAME } from '~/lib/constants'`) are unchanged.
import studioConfig from '../../studio.config'

export const APP_NAME = studioConfig.appName
