export function nail(str: string): string {
  const spacesAtLineStart = str.match(/\n(\s+)/m)
  if (spacesAtLineStart) {
    return str.replace(new RegExp(`^[^\\S\\r\\n]{0,${spacesAtLineStart[1].length}}`, 'gm'), '')
  } else {
    return str
  }
}
