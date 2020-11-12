import { useEffect, useState } from 'react'
import { BehaviorSubject } from 'rxjs'

export const createDataHook = <T>(
  data$: BehaviorSubject<T>,
  initialData: T
) => {
  return () => {
    const [state$, setState$] = useState<T>(initialData)
    useEffect(() => {
      const subscription = data$.subscribe((v) => {
        setState$(() => v)
      })
      return () => {
        subscription.unsubscribe()
      }
    }, [data$])
    return state$
  }
}
