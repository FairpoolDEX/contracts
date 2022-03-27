import { z } from 'zod'

export const IdSchema = z.string().min(1).regex(/^[\w\d-_.]+$/)

export type Id = z.infer<typeof IdSchema>

export interface Identified { id: Id }

export function validateId(id: Id): Id {
  return IdSchema.parse(id)
}

export function byId(id: Id) {
  return (object: Identified) => object.id === id
}
