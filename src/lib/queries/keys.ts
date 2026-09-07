export const qk = {
  collections: () => ['collections'] as const,
  locations: () => ['locations'] as const,
  serviceCategories: () => ['service-categories'] as const,
  worshipLeaders: () => ['worship-leaders'] as const,
  tagCategories: () => ['tag-categories'] as const,
  tags: () => ['tags'] as const,
  songs: (collectionId?: string) => ['songs', collectionId ?? 'all'] as const,
  songDetail: (songId: string) => ['song', songId] as const,
  // Prefiks bez lokalizacji — po nim unieważniamy WSZYSTKIE warianty filtra
  // lokalizacji naraz. `services(id)` to konkretny wariant do czytania.
  servicesAll: () => ['services'] as const,
  services: (locationId?: string) => ['services', locationId ?? 'all'] as const,
  serviceSongs: (serviceId: string) => ['service-songs', serviceId] as const,
  serviceSongCounts: (ids: string[]) => ['service-song-counts', [...ids].sort()] as const,
  sungServiceSongs: () => ['sung-service-songs'] as const,
  pendingTags: () => ['pending-tags'] as const,
}
