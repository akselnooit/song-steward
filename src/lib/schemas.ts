import { z } from 'zod'

export const CreateServiceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export const UpdateServiceSongSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['planned', 'sung']).optional(),
  song_order: z.number().int().nullable().optional(),
})

export const AddSongTagSchema = z.object({
  song_id: z.string().uuid(),
  tag_id: z.string().uuid(),
})

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type AddServiceSongInput = z.infer<typeof AddServiceSongSchema>
export type UpdateServiceSongInput = z.infer<typeof UpdateServiceSongSchema>
export type AddSongTagInput = z.infer<typeof AddSongTagSchema>
