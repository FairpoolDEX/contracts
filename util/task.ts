export function task(message?: string) {
  return new ImplementationError(message || "Implement me")
}

export class ImplementationError extends Error {

}
