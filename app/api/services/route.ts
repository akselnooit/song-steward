import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/services — lista nabożeństw; ?date=YYYY-MM-DD zwraca jedno nabożeństwo
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')

  if (date) {
    const { data, error } = await supabase
      .from('services')
      .select('id, date, location:locations(id, name), category:service_categories(id, name)')
      .eq('date', date)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  }

  // Zwraca dzisiejsze nabożeństwo lub najbliższe przyszłe
  const active = request.nextUrl.searchParams.get('active')
  if (active) {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('services')
      .select('id, date, location:locations(id, name), category:service_categories(id, name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      location:locations(id, name),
      category:service_categories(id, name),
      worship_leader:worship_leaders(id, name),
      service_songs(id, status)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/services — utwórz nowe nabożeństwo
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { location_id, category_id, worship_leader_id, date, notes } = body

  const { data, error } = await supabase
    .from('services')
    .insert({ location_id, category_id, worship_leader_id, date, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
