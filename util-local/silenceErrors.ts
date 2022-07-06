type SilenceFilter = (e: Error) => boolean

type SilenceRunner<Val> = () => Promise<Val>

export async function silenceErrors<Val>(runner: SilenceRunner<Val>, filter: SilenceFilter) {
  try {
    return await runner()
  } catch (e) {
    if (!filter(e)) {
      throw e
    }
  }
}
