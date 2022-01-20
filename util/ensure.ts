export type EnsureException = Error

export type Throwback = () => Promise<Error>

export const defaultCollectionFindThrowback = () => { throw new Error('Can\'t find object in collection') }

export function ensure<Obj, Res>(object: Obj | null | undefined, throwback: Throwback = defaultCollectionFindThrowback) {
  if (object === null || object === undefined) {
    throw throwback()
  } else {
    return object
  }
}

export type Filter<Obj> = (object: Obj) => boolean

export function locate<Obj>(collection: Obj[], filter: Filter<Obj>, exception?: EnsureException) {
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

export const tb = (err: Error) => async () => err
