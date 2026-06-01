import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { qk } from './keys'
import type { SongWithCollection, SongDetail } from '../types'
import type { AddSongTagInput } from '../schemas'

export function useSongs(collectionId?: string) {
  return useQuery({
    queryKey: qk.songs(collectionId),
    queryFn: async () => {
      let q = supabase
        .from('songs')
        .select('id, collection_id, number, title, author, author_image, original_key, minor, collection:collections(id, name, short_name)')
        .order('number')
      if (collectionId) q = q.eq('collection_id', collectionId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as SongWithCollection[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useSongDetail(songId: string | null) {
  return useQuery({
    queryKey: qk.songDetail(songId ?? ''),
    enabled: !!songId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, collection_id, number, title, author, author_image, original_key, minor,
          collection:collections(id, name, short_name),
          song_tags(tag_id, source, pending_removal, tag:tags(id, name, category_id, description))
        `)
        .eq('id', songId!)
        .single()
      if (error) throw error
      return data as unknown as SongDetail
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAddSongTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddSongTagInput) => {
      const { error } = await supabase
        .from('song_tags')
        .insert({ song_id: input.song_id, tag_id: input.tag_id, source: 'user', pending_removal: false })
      if (error) throw error
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
    },
  })
}

export function useRemoveSongTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ song_id, tag_id, source }: { song_id: string; tag_id: string; source: string }) => {
      if (source === 'user') {
        const { error } = await supabase.from('song_tags').delete().eq('song_id', song_id).eq('tag_id', tag_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('song_tags').update({ pending_removal: true }).eq('song_id', song_id).eq('tag_id', tag_id)
        if (error) throw error
      }
    },
    onSuccess: (_, { song_id }) => {
      qc.invalidateQueries({ queryKey: qk.songDetail(song_id) })
      qc.invalidateQueries({ queryKey: qk.pendingTags() })
    },
  })
}

export function useSongHistory(songId: string | null) {
  return useQuery({
    queryKey: ['song-history', songId],
    enabled: !!songId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_songs')
        .select('id, status, added_at, service:services(id, date, location:locations(name), leader:worship_leaders(name))')
        .eq('song_id', songId!)
        .eq('status', 'sung')
        .order('added_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}
