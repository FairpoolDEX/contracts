/**
 * The filename is hardcoded because Hardhat doesn't support ESM in TypeScript projects, which is required for import.meta.url
 * https://hardhat.org/hardhat-runner/docs/advanced/using-esm#esm-and-typescript-projects
 */
export const getHardcodedFilename = (filename: string) => filename
