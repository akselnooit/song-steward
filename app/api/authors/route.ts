import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/authors — unikalni autorzy z tabeli pieśni, posortowani alfabetycznie
export async function GET() {
  const { data, error } = await supabase
    .from('songs')
    .select('author')
    .not('author', 'is', null)
    .order('author')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const authors = [...new Set((data || []).map((r) => r.author as string))].sort((a, b) =>
    a.localeCompare(b, 'pl')
  )
  return NextResponse.json(authors)
}
