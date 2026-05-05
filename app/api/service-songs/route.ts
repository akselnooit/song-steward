import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/service-songs — dodaj pieśń do nabożeństwa
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { service_id, song_id, status } = body

  // Policz ile już jest zaśpiewanych, żeby nadać kolejność
  let song_order: number | null = null
  if (status === 'sung') {
    const { count } = await supabase
      .from('service_songs')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', service_id)
      .eq('status', 'sung')
    song_order = (count || 0) + 1
  }

  const { data, error } = await supabase
    .from('service_songs')
    .insert({ service_id, song_id, status, song_order })
    .select(`
      id, status, song_order, added_at,
      song:songs(id, number, title, author, collection:collections(short_name))
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
