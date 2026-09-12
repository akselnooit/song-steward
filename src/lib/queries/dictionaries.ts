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
    staleTime: 1000 * 60 * 10,
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

/**
 * Nazwy ze słowników są WKLEJONE w wyniki innych zapytań (nabożeństwo niesie
 * `location.name` i `category.name`, pieśń — nazwy swoich tagów). Zmiana nazwy
 * w tabeli nie rusza tamtych wpisów w cache, więc każdy słownik deklaruje,
 * co jeszcze trzeba unieważnić. Dotyczy to zmiany nazwy; przy dodaniu i
 * usunięciu wystarczy sam słownik, ale nie ma powodu tego różnicować —
 * to operacje wykonywane raz na kilka miesięcy, w arkuszu ustawień.
 */
function makeDictMutations(
  table: string,
  queryKey: readonly unknown[],
  dependents: readonly (readonly unknown[])[] = [],
) {
  const useInvalidate = () => {
    const qc = useQueryClient()
    return () => {
      qc.invalidateQueries({ queryKey })
      for (const key of dependents) qc.invalidateQueries({ queryKey: key })
    }
  }
  return {
    useAdd: (insertFields: (name: string) => object) => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: async (name: string) => {
          const { error } = await supabase.from(table).insert(insertFields(name))
          if (error) throw error
        },
        onSuccess: invalidate,
      })
    },
    useRename: () => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
          const { error } = await supabase.from(table).update({ name }).eq('id', id)
          if (error) throw error
        },
        onSuccess: invalidate,
      })
    },
    useDelete: () => {
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: async (id: string) => {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) throw error
        },
        onSuccess: invalidate,
      })
    },
  }
}

const _loc = makeDictMutations('locations', qk.locations(), [qk.servicesAll()])
export const useAddLocation = () => _loc.useAdd(name => ({ name }))
export const useRenameLocation = () => _loc.useRename()
export const useDeleteLocation = () => _loc.useDelete()

const _cat = makeDictMutations('service_categories', qk.serviceCategories(), [qk.servicesAll()])
export const useAddServiceCategory = () => _cat.useAdd(name => ({ name }))
export const useRenameServiceCategory = () => _cat.useRename()
export const useDeleteServiceCategory = () => _cat.useDelete()

const _wl = makeDictMutations('worship_leaders', qk.worshipLeaders(), [qk.servicesAll()])
export const useAddWorshipLeader = () => _wl.useAdd(name => ({ name }))
export const useRenameWorshipLeader = () => _wl.useRename()
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

/** Nazwa tagu siedzi też w szczegółach pieśni (`['song', id]`) i w kolejce
 *  moderacji — obie kopie muszą pójść za zmianą, inaczej stara nazwa zostaje
 *  na ekranie pieśni aż do odświeżenia aplikacji. */
export function useRenameTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('tags').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tags() })
      qc.invalidateQueries({ queryKey: ['song'] })
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
    },
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
