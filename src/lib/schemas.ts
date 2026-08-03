import { z } from 'zod'

// Godzina rozpoczęcia: pełny kwadrans, 24 h, bez sekund. Ten sam warunek pilnuje
// CHECK w bazie (`services_start_time_quarter`) — walidacja tutaj jest po to,
// żeby błąd nie musiał lecieć aż do Postgresa.
const startTime = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/)

export const CreateServiceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: startTime,
  location_id: z.string().uuid(),
  category_id: z.string().uuid(),
  worship_leader_id: z.string().uuid().nullable(),
  notes: z.string().nullable().default(null),
})

export const AddServiceSongSchema = z.object({
  service_id: z.string().uuid(),
  song_id: z.string().uuid(),
  status: z.enum(['planned', 'sung']),
  song_order: z.number().int().nullable().default(null),
})

// Oznaczenie pieśni jako zaśpiewanej w danym nabożeństwie. `planned_id` = wiersz
// zaplanowany, który ma zostać skonsumowany (awans planned→sung); null → nowy wiersz.
export const MarkSongSungSchema = z.object({
  service_id: z.string().uuid(),
  song_id: z.string().uuid(),
  planned_id: z.string().uuid().nullable(),
  song_order: z.number().int(),
})

export const UpdateServiceSongSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['planned', 'sung']).optional(),
  song_order: z.number().int().nullable().optional(),
})

export const UpdateServiceSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: startTime,
  location_id: z.string().uuid(),
  category_id: z.string().uuid(),
  worship_leader_id: z.string().uuid().nullable(),
})

export const AddSongTagSchema = z.object({
  song_id: z.string().uuid(),
  tag_id: z.string().uuid(),
})

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>
export type AddServiceSongInput = z.infer<typeof AddServiceSongSchema>
export type MarkSongSungInput = z.infer<typeof MarkSongSungSchema>
export type UpdateServiceSongInput = z.infer<typeof UpdateServiceSongSchema>
export type AddSongTagInput = z.infer<typeof AddSongTagSchema>
