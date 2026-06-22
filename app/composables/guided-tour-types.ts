// app/composables/guided-tour-types.ts
//
// PORTED from ICJIA/nuxt-guided-tour's runtime `types.ts` (copied into the app, no module).
// `UseTourReturn` is renamed `UseGuidedTourReturn` to match the renamed composable
// (see useGuidedTour.ts header — avoids any collision with @nuxt/ui's `useTour`).
import type { Ref, ComputedRef } from 'vue'

/** Position of the tour popover relative to the target element. */
export type TourPosition = 'top' | 'bottom' | 'left' | 'right'

/** Alignment of the tour popover along the position axis. */
export type TourAlign = 'start' | 'center' | 'end'

/** Definition of a single tour step. */
export interface TourStep {
  /** Unique identifier for the step. */
  id: string
  /** CSS selector to find the target element. Typically `[data-tour="step-id"]`. */
  target: string
  /** Title displayed in the popover header. */
  title: string
  /** Main descriptive content for the step. */
  content: string
  /** Optional additional tip or warning. */
  tip?: string
  /** Popover position relative to target element. @default 'bottom' */
  position?: TourPosition
  /** Popover alignment along the position axis. @default 'center' */
  align?: TourAlign
  /** Whether to show highlight ring around target element. @default true */
  highlight?: boolean
  /** Optional icon to display (iconify format). */
  icon?: string
  /** @deprecated Use `shortcuts` array for multiple shortcuts. */
  shortcut?: string[]
  /** @deprecated Use `shortcuts` array for multiple shortcuts. */
  shortcutWin?: string[]
  /** Multiple keyboard shortcuts to display. */
  shortcuts?: Array<{
    label: string
    mac: string[]
    win: string[]
  }>
}

/** Configuration for a guided tour instance. */
export interface TourConfig {
  /** Tour version number. Increment to force re-display. */
  version: number
  /** Whether to automatically start the tour for first-time users. @default true */
  autoStart: boolean
  /** Delay in ms before auto-starting. @default 800 */
  autoStartDelay: number
  /** LocalStorage key prefix. Version is appended: `prefix-v1`. */
  storageKeyPrefix: string
  /** Ordered array of tour steps. */
  steps: TourStep[]
  /**
   * Optional custom announce function for screen reader announcements.
   * If not provided, the composable creates a built-in ARIA live region.
   */
  announce?: (message: string, priority?: 'polite' | 'assertive') => void
}

/** Progress information for the current tour. */
export interface TourProgress {
  /** Current step number (1-indexed for display). */
  current: number
  /** Total number of steps. */
  total: number
  /** Completion percentage (0-100). */
  percentage: number
}

/** Return type for the useGuidedTour composable. */
export interface UseGuidedTourReturn {
  steps: TourStep[]
  version: number
  autoStart: boolean
  autoStartDelay: number
  currentStepIndex: Ref<number>
  currentStep: ComputedRef<TourStep | null>
  isActive: ComputedRef<boolean>
  hasCompletedTour: Ref<boolean>
  progress: ComputedRef<TourProgress>
  start: () => void
  next: () => void
  previous: () => void
  cancel: () => void
  complete: () => void
  goToStep: (index: number) => void
  getStepById: (id: string) => TourStep | undefined
  getStepIndex: (id: string) => number
  handleKeydown: (event: KeyboardEvent) => void
  markAsSeen: () => void
  resetCompletion: () => void
}

// --- Intro slide types ---

export interface IntroSlideExample {
  label: string
  syntax: string
  result: string
}

export interface IntroSlideBenefit {
  icon: string
  title: string
  description: string
}

export interface IntroSlideConversion {
  from: string
  to: string
  problem: string
  solution: string
}

export interface IntroSlideCallout {
  icon: string
  title: string
  text: string
}

export interface IntroSlide {
  title: string
  icon: string
  content: string[]
  examples?: IntroSlideExample[]
  benefits?: IntroSlideBenefit[]
  conversions?: IntroSlideConversion[]
  callout?: IntroSlideCallout
  footer?: string
}
