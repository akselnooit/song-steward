import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/song-tags — przypisz tag do pieśni (oczekuje na zatwierdzenie)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { song_id, tag_id } = body

  // Sprawdź czy ten tag był już wcześniej i czeka na usunięcie — jeśli tak, przywróć
  const { data: existing } = await supabase
    .from('song_tags')
    .select('source, pending_removal')
    .eq('song_id', song_id)
    .eq('tag_id', tag_id)
    .maybeSingle()

  if (existing?.pending_removal) {
    const { data, error } = await supabase
      .from('song_tags')
      .update({ pending_removal: false })
      .eq('song_id', song_id)
      .eq('tag_id', tag_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (existing) {
    return NextResponse.json(existing)
  }

  const { data, error } = await supabase
    .from('song_tags')
    .insert({ song_id, tag_id, source: 'user' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/song-tags — oznacz tag jako oczekujący na usunięcie (soft delete)
export async function DELETE(request: NextRequest) {
  const { song_id, tag_id } = await request.json()

  const { error } = await supabase
    .from('song_tags')
    .update({ pending_removal: true })
    .eq('song_id', song_id)
    .eq('tag_id', tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/song-tags — akcje administratora
// action: 'confirm_add'    → potwierdź dodanie (user → confirmed)
// action: 'confirm_remove' → potwierdź usunięcie (hard delete)
// action: 'restore'        → przywróć tag (pending_removal → false)
export async function PATCH(request: NextRequest) {
  const { song_id, tag_id, action } = await request.json()

  if (action === 'confirm_add') {
    const { error } = await supabase
      .from('song_tags')
      .update({ source: 'confirmed' })
      .eq('song_id', song_id)
      .eq('tag_id', tag_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'confirm_remove') {
    const { error } = await supabase
      .from('song_tags')
      .delete()
      .eq('song_id', song_id)
      .eq('tag_id', tag_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'restore') {
    const { error } = await supabase
      .from('song_tags')
      .update({ pending_removal: false })
      .eq('song_id', song_id)
      .eq('tag_id', tag_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
