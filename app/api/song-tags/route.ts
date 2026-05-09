import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/song-tags — przypisz tag do pieśni
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { song_id, tag_id } = body

  const { data, error } = await supabase
    .from('song_tags')
    .insert({ song_id, tag_id, source: 'user' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/song-tags — usuń tag z pieśni
export async function DELETE(request: NextRequest) {
  const { song_id, tag_id } = await request.json()

  const { error } = await supabase
    .from('song_tags')
    .delete()
    .eq('song_id', song_id)
    .eq('tag_id', tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
