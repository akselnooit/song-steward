import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/tags — wszystkie tagi pogrupowane wg kategorii
export async function GET() {
  const { data, error } = await supabase
    .from('tags')
    .select('*, category:tag_categories(id, name, user_editable)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/tags — dodaj tag
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, description, category_id } = body

  const { data, error } = await supabase
    .from('tags')
    .insert({ name, description, category_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
