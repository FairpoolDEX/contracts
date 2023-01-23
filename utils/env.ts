export function demandIntegerEnvVar(name: string, unit?: string) {
  const value = parseInt(process.env[name] || '0', 10)
  if (value) {
    if (!process.env.SILENCE_ENV_VAR) {
      console.info(`${name} = ${value} ${unit}`)
    }
  } else {
    console.error(`[ERROR] ${name} environment variable must be set${unit ? ` (unit: ${unit})` : ''}.`.trim())
    process.exit(1)
  }
  return value
}

export function assumeIntegerEnvVar(name: string, $default: number): number;

export function assumeIntegerEnvVar(name: string, $default?: undefined): number | undefined;

export function assumeIntegerEnvVar(name: string, $default?: number): number | undefined {
  const value = process.env[name]
  if (value) {
    return parseInt(value, 10)
  } else {
    return $default
  }
}
