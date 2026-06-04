import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { qk } from './keys'
import type { ServiceWithRefs, ServiceSongWithSong, StatsFilters, TopSungRow, NeverSungRow } from '../types'
import type { CreateServiceInput, UpdateServiceInput, AddServiceSongInput, UpdateServiceSongInput } from '../schemas'
import type { Location, ServiceCategory, WorshipLeader } from '../types'

export function useServices(locationId?: string) {
  return useQuery({
    queryKey: qk.services(locationId),
    queryFn: async () => {
      let q = supabase
        .from('services')
        .select('id, date, notes, location_id, category_id, worship_leader_id, location:locations(id, name), category:service_categories(id, name), leader:worship_leaders(id, name)')
        .order('date', { ascending: false })
      if (locationId) q = q.eq('location_id', locationId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as ServiceWithRefs[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useService(serviceId: string | null) {
  return useQuery({
    queryKey: ['service', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, date, notes, location_id, category_id, worship_leader_id, location:locations(id, name), category:service_categories(id, name), leader:worship_leaders(id, name)')
        .eq('id', serviceId!)
        .single()
      if (error) throw error
      return data as unknown as ServiceWithRefs
    },
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateServiceInput) => {
      const { error } = await supabase.from('services').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, date, location_id, category_id, worship_leader_id }) => {
      await qc.cancelQueries({ queryKey: ['service', id] })
      const prev = qc.getQueryData<ServiceWithRefs>(['service', id])
      const locations = qc.getQueryData<Location[]>(qk.locations())
      const categories = qc.getQueryData<ServiceCategory[]>(qk.serviceCategories())
      const leaders = qc.getQueryData<WorshipLeader[]>(qk.worshipLeaders())
      const location = locations?.find(l => l.id === location_id)
      const category = categories?.find(c => c.id === category_id)
      const leader = worship_leader_id ? (leaders?.find(l => l.id === worship_leader_id) ?? null) : null
      if (prev && location && category) {
        qc.setQueryData<ServiceWithRefs>(['service', id], {
          ...prev, date, location_id, category_id, worship_leader_id, location, category, leader,
        })
      }
      return { prev }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['service', id], ctx.prev)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['service', id] })
      qc.invalidateQueries({ queryKey: qk.services() })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services() }),
  })
}

export function useServiceSongs(serviceId: string | null) {
  return useQuery({
    queryKey: qk.serviceSongs(serviceId ?? ''),
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_songs')
        .select('id, service_id, song_id, status, song_order, added_at, song:songs(id, collection_id, number, title, author, original_key, minor, collection:collections(id, name, short_name))')
        .eq('service_id', serviceId!)
        .order('song_order', { nullsFirst: false })
      if (error) throw error
      return data as unknown as ServiceSongWithSong[]
    },
    staleTime: 0,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const { data, error } = await supabase.from('services').insert(input).select('id').single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services() }),
  })
}

export function useAddServiceSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddServiceSongInput) => {
      const { data, error } = await supabase.from('service_songs').insert(input).select('id').single()
      if (error) throw error
      return data.id as string
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.serviceSongs(input.service_id) })
    },
    onSuccess: (_, { service_id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceSongs(service_id) })
    },
  })
}

export function useUpdateServiceSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateServiceSongInput & { service_id: string }) => {
      const { error } = await supabase.from('service_songs').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ service_id, id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.serviceSongs(service_id) })
      const prev = qc.getQueryData<ServiceSongWithSong[]>(qk.serviceSongs(service_id))
      qc.setQueryData<ServiceSongWithSong[]>(qk.serviceSongs(service_id), old =>
        old?.map(ss => ss.id === id ? { ...ss, ...patch } : ss) ?? []
      )
      return { prev }
    },
    onError: (_err, { service_id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.serviceSongs(service_id), ctx.prev)
    },
    onSettled: (_, __, { service_id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceSongs(service_id) })
    },
  })
}

export function useRemoveServiceSong() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; service_id: string }) => {
      const { error } = await supabase.from('service_songs').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, service_id }) => {
      await qc.cancelQueries({ queryKey: qk.serviceSongs(service_id) })
      const prev = qc.getQueryData<ServiceSongWithSong[]>(qk.serviceSongs(service_id))
      qc.setQueryData<ServiceSongWithSong[]>(qk.serviceSongs(service_id), old =>
        old?.filter(ss => ss.id !== id) ?? []
      )
      return { prev }
    },
    onError: (_err, { service_id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.serviceSongs(service_id), ctx.prev)
    },
    onSettled: (_, __, { service_id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceSongs(service_id) })
    },
  })
}

export function useUpdateServiceNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from('services').update({ notes }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, notes }) => {
      await qc.cancelQueries({ queryKey: ['service', id] })
      const prev = qc.getQueryData<ServiceWithRefs>(['service', id])
      qc.setQueryData<ServiceWithRefs>(['service', id], old => old ? { ...old, notes } : old)
      return { prev }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['service', id], ctx.prev)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['service', id] })
      qc.invalidateQueries({ queryKey: qk.services() })
    },
  })
}

export function useTopSung(filters: StatsFilters) {
  return useQuery({
    queryKey: qk.topSung(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_sung', {
        p_location_id: filters.locationId ?? null,
        p_leader_id: filters.leaderId ?? null,
        p_months: filters.months ?? null,
        p_tag_ids_include: filters.tagIdsInclude ?? [],
        p_tag_ids_exclude: filters.tagIdsExclude ?? [],
        p_limit: 5,
      })
      if (error) throw error
      return data as TopSungRow[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useNeverSung(filters: StatsFilters) {
  return useQuery({
    queryKey: qk.neverSung(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_never_sung', {
        p_location_id: filters.locationId ?? null,
        p_leader_id: filters.leaderId ?? null,
        p_months: filters.months ?? null,
        p_tag_ids_include: filters.tagIdsInclude ?? [],
        p_tag_ids_exclude: filters.tagIdsExclude ?? [],
        p_limit: 5,
      })
      if (error) throw error
      return data as NeverSungRow[]
    },
    staleTime: 1000 * 60 * 5,
  })
}
