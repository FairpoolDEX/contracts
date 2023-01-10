type SilenceFilter = (e: Error) => boolean

type SilenceRunner<Val> = () => Promise<Val>

export async function silenceErrors<Val>(runner: SilenceRunner<Val>, filter: SilenceFilter) {
  try {
    return await runner()
  } catch (e) {
    if (e instanceof Error) {
      if (!filter(e)) {
        throw e
      }
    } else {
      throw e
    }
  }
}
