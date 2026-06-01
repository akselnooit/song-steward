import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { qk } from './keys'
import type { Collection, Location, ServiceCategory, WorshipLeader, TagCategory, Tag } from '../types'

export function useCollections() {
  return useQuery({
    queryKey: qk.collections(),
    queryFn: async () => {
      const { data, error } = await supabase.from('collections').select('id, name, short_name').order('name')
      if (error) throw error
      return data as Collection[]
    },
    staleTime: Infinity,
  })
}

export function useLocations() {
  return useQuery({
    queryKey: qk.locations(),
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('id, name').order('name')
      if (error) throw error
      return data as Location[]
    },
    staleTime: Infinity,
  })
}

export function useServiceCategories() {
  return useQuery({
    queryKey: qk.serviceCategories(),
    queryFn: async () => {
      const { data, error } = await supabase.from('service_categories').select('id, name').order('name')
      if (error) throw error
      return data as ServiceCategory[]
    },
    staleTime: Infinity,
  })
}

export function useWorshipLeaders() {
  return useQuery({
    queryKey: qk.worshipLeaders(),
    queryFn: async () => {
      const { data, error } = await supabase.from('worship_leaders').select('id, name, auth_user_id, email').order('name')
      if (error) throw error
      return data as WorshipLeader[]
    },
    staleTime: Infinity,
  })
}

export function useTagCategories() {
  return useQuery({
    queryKey: qk.tagCategories(),
    queryFn: async () => {
      const { data, error } = await supabase.from('tag_categories').select('id, name, user_editable').order('name')
      if (error) throw error
      return data as TagCategory[]
    },
    staleTime: Infinity,
  })
}

export function useTags() {
  return useQuery({
    queryKey: qk.tags(),
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('id, category_id, name, description').order('name')
      if (error) throw error
      return data as Tag[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Mutations ────────────────────────────────────────────────────

function makeAddDelete(
  table: string,
  queryKey: readonly unknown[],
) {
  return {
    useAdd: (insertFields: (name: string) => object) => {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: async (name: string) => {
          const { error } = await supabase.from(table).insert(insertFields(name))
          if (error) throw error
        },
        onSuccess: () => qc.invalidateQueries({ queryKey }),
      })
    },
    useDelete: () => {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: async (id: string) => {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) throw error
        },
        onSuccess: () => qc.invalidateQueries({ queryKey }),
      })
    },
  }
}

const _loc = makeAddDelete('locations', qk.locations())
export const useAddLocation = () => _loc.useAdd(name => ({ name }))
export const useDeleteLocation = () => _loc.useDelete()

const _cat = makeAddDelete('service_categories', qk.serviceCategories())
export const useAddServiceCategory = () => _cat.useAdd(name => ({ name }))
export const useDeleteServiceCategory = () => _cat.useDelete()

const _wl = makeAddDelete('worship_leaders', qk.worshipLeaders())
export const useAddWorshipLeader = () => _wl.useAdd(name => ({ name }))
export const useDeleteWorshipLeader = () => _wl.useDelete()

export function useAddTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, category_id }: { name: string; category_id: string }) => {
      const { error } = await supabase.from('tags').insert({ name, category_id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tags() }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tags() }),
  })
}
