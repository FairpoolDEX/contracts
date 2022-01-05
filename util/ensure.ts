export type EnsureException = Error

export function ensure<Obj>(object: Obj | null | undefined, exception: EnsureException = new Error('Can\'t find object in collection')) {
  if (object === null || object === undefined) throw exception
  return object
}

export type Filter<Obj> = (object: Obj) => boolean

export function ensureList<Obj>(collection: Obj[], filter: Filter<Obj>, exception?: EnsureException) {
  const object = collection.find(filter)
  if (object === null || object === undefined) {
    if (exception) {
      throw exception
    } else {
      throw new Error('Can\'t find an object in a collection using filter: ' + filter.toString())
    }
  }
  return object
}
