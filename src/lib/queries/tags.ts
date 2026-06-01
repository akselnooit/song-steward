import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { qk } from './keys'

interface PendingTagEntry {
  song_id: string
  tag_id: string
  source: 'confirmed' | 'user' | 'ai'
  pending_removal: boolean
  song: { id: string; number: number; title: string; collection: { short_name: string } }
  tag: { id: string; name: string }
}

export function usePendingTags() {
  return useQuery({
    queryKey: qk.pendingTags(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_tags')
        .select('song_id, tag_id, source, pending_removal, song:songs(id, number, title, collection:collections(short_name)), tag:tags(id, name)')
        .or('source.eq.user,pending_removal.eq.true')
        .order('song_id')
      if (error) throw error
      return data as unknown as PendingTagEntry[]
    },
    staleTime: 0,
  })
}

export function useConfirmTagAddition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ song_id, tag_id }: { song_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from('song_tags')
        .update({ source: 'confirmed' })
        .eq('song_id', song_id)
        .eq('tag_id', tag_id)
      if (error) throw error
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
    },
  })
}

export function useRejectTagAddition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ song_id, tag_id }: { song_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from('song_tags')
        .delete()
        .eq('song_id', song_id)
        .eq('tag_id', tag_id)
        .eq('source', 'user')
      if (error) throw error
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
    },
  })
}

export function useConfirmTagRemoval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ song_id, tag_id }: { song_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from('song_tags')
        .delete()
        .eq('song_id', song_id)
        .eq('tag_id', tag_id)
      if (error) throw error
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
    },
  })
}

export function useRestoreTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ song_id, tag_id }: { song_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from('song_tags')
        .update({ pending_removal: false })
        .eq('song_id', song_id)
        .eq('tag_id', tag_id)
      if (error) throw error
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
    },
  })
}
