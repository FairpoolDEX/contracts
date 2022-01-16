
export type Callback<Res> = () => Res

export type Throwback = () => Promise<Error>

export const defaultCallback: Callback<undefined> = () => undefined

export const defaultCollectionFindThrowback = () => { throw new Error('Can\'t find object in collection') }

export const tb = (err: Error) => async () => err
