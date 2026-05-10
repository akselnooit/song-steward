import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/songs — lista pieśni z opcjonalnym filtrowaniem
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const collectionId = searchParams.get('collection_id') || ''
  const authorId = searchParams.get('author_id') || ''
  const tagIds = searchParams.getAll('tag_id')

  let query = supabase
    .from('songs')
    .select(`
      *,
      collection:collections(id, name, short_name),
      song_tags(tag_id)
    `)
    .order('number')

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,number.eq.${parseInt(search) || 0}`)
  }

  if (collectionId) {
    query = query.eq('collection_id', collectionId)
  }

  if (authorId) {
    query = query.eq('author_id', authorId)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtrowanie po tagach po stronie serwera (AND — wszystkie tagi muszą pasować)
  let songs = data || []
  if (tagIds.length > 0) {
    songs = songs.filter((song) => {
      const songTagIds = song.song_tags.map((st: { tag_id: string }) => st.tag_id)
      return tagIds.every((tagId) => songTagIds.includes(tagId))
    })
  }

  // Sortuj wg kolekcji: DP → KM → NDP → NKM → SOS → reszta, potem numer
  const COLLECTION_ORDER: Record<string, number> = { DP: 0, KM: 1, NDP: 2, NKM: 3, SOS: 4 }
  songs.sort((a, b) => {
    const aOrder = COLLECTION_ORDER[a.collection?.short_name ?? ''] ?? 99
    const bOrder = COLLECTION_ORDER[b.collection?.short_name ?? ''] ?? 99
    if (aOrder !== bOrder) return aOrder - bOrder
    return (a.number ?? 0) - (b.number ?? 0)
  })

  return NextResponse.json(songs)
}

// POST /api/songs — dodaj nową pieśń
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { collection_id, number, title, author } = body

  const { data, error } = await supabase
    .from('songs')
    .insert({ collection_id, number, title, author })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
