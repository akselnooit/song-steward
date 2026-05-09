import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  'https://nnwgazsjtvauweiqjgvk.supabase.co',
  'sb_publishable_PaQe3v3Nkcuaj_I96tY4gw_6a_3cJyS'
)

const raw = JSON.parse(readFileSync(new URL('./songs', import.meta.url), 'utf8'))

const updates = raw.result
  .filter((s) => s.originalKey)
  .map((s) => ({ id: s.id, original_key: s.originalKey, minor: s.minor ?? false }))

console.log(`Aktualizuję tonację dla ${updates.length} pieśni...`)

const BATCH = 100
let updated = 0

for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH)
  const { error } = await supabase.from('songs').upsert(batch, { onConflict: 'id' })
  if (error) {
    console.error(`Błąd w batchu ${i}:`, error.message)
  } else {
    updated += batch.length
    process.stdout.write(`\r${updated}/${updates.length}`)
  }
}

console.log('\nGotowe.')
