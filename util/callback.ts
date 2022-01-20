
export type Callback<Res> = () => Res

export const defaultCallback: Callback<undefined> = () => undefined
