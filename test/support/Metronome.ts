export interface Metronome {
  date: () => Date
  timestamp: () => number
  tick: (ms: number) => Date
  add: (ms: number) => Date
}

export class TestMetronome implements Metronome {
  constructor(protected _now = new Date("2020-02-01T00:00:00Z")) {}

  date() {
    return this._now
  }

  timestamp() {
    return this._now.getTime()
  }

  tick(ms = 1000) {
    const now = this._now
    this._now = new Date(this._now.getTime() + ms)
    return now
  }

  add(ms: number) {
    return new Date(this._now.getTime() + ms)
  }
}

export class ProdMetronome implements Metronome {
  date() {
    return new Date()
  }

  timestamp() {
    return Date.now()
  }

  tick() {
    return new Date()
  }

  add(ms: number) {
    return new Date(Date.now() + ms)
  }
}

export const metronome = process.env.NODE_ENV === "development" ? new TestMetronome() : new ProdMetronome()
