import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/songs/[id] — szczegóły pieśni z tagami i historią śpiewania
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [songResult, historyResult] = await Promise.all([
    supabase
      .from('songs')
      .select(`
        *,
        collection:collections(id, name, short_name),
        song_tags(
          tag:tags(id, name, category_id, category:tag_categories(id, name))
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('service_songs')
      .select(`
        id, status, added_at,
        service:services(id, date, service_type:service_types(name))
      `)
      .eq('song_id', id)
      .eq('status', 'sung')
      .order('added_at', { ascending: false })
      .limit(20),
  ])

  if (songResult.error) return NextResponse.json({ error: songResult.error.message }, { status: 500 })

  return NextResponse.json({
    ...songResult.data,
    history: historyResult.data || [],
  })
}

// PATCH /api/songs/[id] — edytuj pieśń
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('songs')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/songs/[id] — usuń pieśń
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
