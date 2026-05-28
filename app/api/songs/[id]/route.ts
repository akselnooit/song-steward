import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/songs/[id] — szczegóły pieśni z tagami i historią śpiewania
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const locationId = request.nextUrl.searchParams.get('location_id')

  let historyQuery = supabase
    .from('service_songs')
    .select(`
      id, status, added_at,
      service:services(
        id, date, location_id,
        location:locations(id, name),
        category:service_categories(id, name),
        worship_leader:worship_leaders(name)
      )
    `)
    .eq('song_id', id)
    .eq('status', 'sung')
    .order('added_at', { ascending: false })
    .limit(20)

  const [songResult, historyResult] = await Promise.all([
    supabase
      .from('songs')
      .select(`
        *,
        collection:collections(id, name, short_name),
        song_tags(
          source,
          pending_removal,
          tag:tags(id, name, category_id, category:tag_categories(id, name))
        )
      `)
      .eq('id', id)
      .single(),
    historyQuery,
  ])

  if (songResult.error) return NextResponse.json({ error: songResult.error.message }, { status: 500 })

  let history = historyResult.data || []

  // Filter by location if provided
  if (locationId) {
    history = history.filter((entry) => {
      const svc = Array.isArray(entry.service) ? entry.service[0] : entry.service
      return svc?.location_id === locationId
    })
  }

  return NextResponse.json({
    ...songResult.data,
    history,
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
