import { Subject } from 'rxjs'
import { debounceTime, throttleTime } from 'rxjs/operators'

/**
 * Generate a debounced Function base on the actual function
 * Debounced execute after time
 * @param fn
 * @param time
 * @category Tools
 * @example
 * ```ts
 * const debouncePatch = debounce( async (body) => {
 *    await client.id('12345').patch(body);
 * },200)
 *
 * ...
 * debouncePatch(body)
 *
 * ```
 */
const debounce = <T extends Function>(fn: T, time: number): Function => {
  const observable = new Subject<any[]>()
  observable.pipe(debounceTime(time)).subscribe((args: any[]) => {
    return fn(...args)
  })
  return (...args: any[]) => {
    observable.next(args)
  }
}

/**
 * Throttle execution within time
 * @param fn
 * @param time
 * @category Tools
 */
const throttle = <T extends Function>(fn: T, time: number): Function => {
  const observable = new Subject<any[]>()
  observable.pipe(throttleTime(time)).subscribe((args: any[]) => {
    return fn(...args)
  })
  return (...args: any[]) => {
    observable.next(args)
  }
}

export { debounce, throttle }
