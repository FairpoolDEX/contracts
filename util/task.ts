export function task(message?: string) {
  return new Error(message || "Implement me")
}

// better to move the constant into a separate function & throw task() within that function body
export function stub<T>(value: T): T {
  return value
}
