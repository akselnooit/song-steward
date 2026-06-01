import { useQuery } from '@tanstack/react-query'
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
