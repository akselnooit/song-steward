import type { StatsFilters } from '../types'

export const qk = {
  collections: () => ['collections'] as const,
  locations: () => ['locations'] as const,
  serviceCategories: () => ['service-categories'] as const,
  worshipLeaders: () => ['worship-leaders'] as const,
  tagCategories: () => ['tag-categories'] as const,
  tags: () => ['tags'] as const,
  songs: (collectionId?: string) => ['songs', collectionId ?? 'all'] as const,
  songDetail: (songId: string) => ['song', songId] as const,
  services: (locationId?: string) => ['services', locationId ?? 'all'] as const,
  serviceSongs: (serviceId: string) => ['service-songs', serviceId] as const,
  topSung: (f: StatsFilters) => ['top-sung', f] as const,
  neverSung: (f: StatsFilters) => ['never-sung', f] as const,
  pendingTags: () => ['pending-tags'] as const,
}
