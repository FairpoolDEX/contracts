export function nail(str: string): string {
  const spacesAtLineStart = str.match(/\n(\s+)/m)
  if (spacesAtLineStart) {
    return str.replace(new RegExp(`^[^\\S\\r\\n]{0,${spacesAtLineStart[1].length}}`, 'gm'), '')
  } else {
    return str
  }
}

export type Stringable = string | {toString: () => string}

export function toString(s: Stringable) {
  return typeof s === 'string' ? s : s.toString()
}
