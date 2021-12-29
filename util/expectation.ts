export async function importExpectations(expectationsPath: string) {
  return (await import(`${process.cwd()}/${expectationsPath}`)).expectations
}
