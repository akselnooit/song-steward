import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/pending-tags — pobierz pieśni z oczekującymi zmianami tagów
// Zwraca pieśni które mają tagi z source='user' lub pending_removal=true
export async function GET() {
  const { data, error } = await supabase
    .from('song_tags')
    .select(`
      source,
      pending_removal,
      song:songs(id, number, title, collection:collections(short_name)),
      tag:tags(id, name)
    `)
    .or('source.eq.user,pending_removal.eq.true')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Grupuj wg pieśni
  type Row = {
    source: string
    pending_removal: boolean
    song: { id: string; number: number; title: string; collection: { short_name: string } | null } | null
    tag: { id: string; name: string } | null
  }

  const songMap: Record<string, {
    id: string; number: number; title: string; collection: { short_name: string } | null
    pending_additions: { id: string; name: string }[]
    pending_removals: { id: string; name: string }[]
  }> = {}

  for (const row of (data || []) as unknown as Row[]) {
    const song = Array.isArray(row.song) ? row.song[0] : row.song
    const tag = Array.isArray(row.tag) ? row.tag[0] : row.tag
    if (!song || !tag) continue

    if (!songMap[song.id]) {
      songMap[song.id] = { ...song, pending_additions: [], pending_removals: [] }
    }

    if (row.pending_removal) {
      songMap[song.id].pending_removals.push(tag)
    } else if (row.source === 'user') {
      songMap[song.id].pending_additions.push(tag)
    }
  }

  const songs = Object.values(songMap).sort((a, b) => {
    const aHasRemoval = a.pending_removals.length > 0 ? 1 : 0
    const bHasRemoval = b.pending_removals.length > 0 ? 1 : 0
    return bHasRemoval - aHasRemoval || a.number - b.number
  })

  const totalAdditions = songs.reduce((s, song) => s + song.pending_additions.length, 0)
  const totalRemovals = songs.reduce((s, song) => s + song.pending_removals.length, 0)

  return NextResponse.json({ totalAdditions, totalRemovals, songs })
}
