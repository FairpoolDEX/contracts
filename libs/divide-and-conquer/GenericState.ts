export interface GenericState<Data, Out, Err extends Error> {
  data: Data
  output?: Out
  error?: Err
}
