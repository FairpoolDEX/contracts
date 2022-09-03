export interface GenericState<Data, Output, Error> {
  data: Data
  output?: Output
  error?: Error
}
