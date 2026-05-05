import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/services — lista nabożeństw
export async function GET() {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      service_type:service_types(id, name),
      worship_leader:worship_leaders(id, name),
      service_songs(id, status)
    `)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/services — utwórz nowe nabożeństwo
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { service_type_id, worship_leader_id, date, notes } = body

  const { data, error } = await supabase
    .from('services')
    .insert({ service_type_id, worship_leader_id, date, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
