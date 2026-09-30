/** One shared requestAnimationFrame loop. It only runs while something is subscribed. */
type Tick = (time: number) => void

let subscribers: Tick[] = []
let frame = 0

const loop = (time: number): void => {
  subscribers.forEach((tick) => tick(time))
  frame = subscribers.length ? window.requestAnimationFrame(loop) : 0
}

export const subscribe = (tick: Tick): (() => void) => {
  subscribers = [...subscribers, tick]
  if (!frame) frame = window.requestAnimationFrame(loop)
  return () => {
    subscribers = subscribers.filter((item) => item !== tick)
  }
}
