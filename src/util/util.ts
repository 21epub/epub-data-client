import { BehaviorSubject, Observable } from 'rxjs'
import { AjaxError } from 'rxjs/ajax'
import { tap, filter, map } from 'rxjs/operators'
import { AjaxFetcherResponse } from '../type'
import { getErrorMsg } from './catchError'

export const generateInitData = () => {
  return {
    numpages: 1,
    sum: 0,
    results: [],
    facet: [],
    page: 1,
    size: 1
  }
}

export const parseUrl = (prefix: string, suffix?: string): string =>
  prefix.endsWith('/') ? `${prefix}${suffix}` : `${prefix}/${suffix}`

export const urlJoin = (
  [initUrl, ...joinUrls]: [string, ...Array<string | undefined>],
  slash: boolean = true
): string => {
  if (!joinUrls || !joinUrls?.length) return initUrl
  const urls = joinUrls.filter((v) => v) as string[]
  const result = urls.reduce(
    (prev, next) => (next ? parseUrl(prev, next) : prev),
    initUrl
  )
  return result.endsWith('/') ? result : slash ? result + '/' : result
}

export const parseData = <T>(data: AjaxFetcherResponse<T>): T[] | [] =>
  data?.response?.data?.results ?? []

export const parseResponse = <T>(
  observer: Observable<AjaxFetcherResponse<T>>,
  catchErr?: (error: AjaxError) => void,
  catchMsg?: (msg: string) => void,
  loading$?: BehaviorSubject<boolean>
): Promise<void | T[] | undefined> => {
  if (loading$) {
    loading$.next(true)
  }
  return observer
    .pipe(
      tap((data) => {
        if (data?.response.code !== 200) {
          throw data
        }
      }),
      filter((data) => data?.response?.code === 200),
      map((data: AjaxFetcherResponse<T>) => parseData(data))
    )
    .toPromise()
    .then((data) => {
      if (loading$) {
        loading$.next(false)
      }
      return data
    })
    .catch((error) => {
      if (loading$) {
        loading$.next(false)
      }
      if (catchErr) catchErr(error)
      if (catchMsg) catchMsg(getErrorMsg(error))
      throw error
    })
}

export const parseRawResponse = <T>(
  observer: Observable<AjaxFetcherResponse<T>>,
  catchErr?: (error: AjaxError) => void,
  catchMsg?: (msg: string) => void,
  loading$?: BehaviorSubject<boolean>
): Promise<void | AjaxFetcherResponse<T>> => {
  if (loading$) {
    loading$.next(true)
  }
  console.log(observer)
  return observer
    .pipe(
      tap((data) => {
        if (data?.response.code !== 200) {
          throw data
        }
      }),
      filter((data) => data?.response?.code === 200)
    )
    .toPromise()
    .then((data) => {
      if (loading$) {
        loading$.next(false)
      }
      return data
    })
    .catch((error) => {
      if (loading$) {
        loading$.next(false)
      }
      if (catchErr) catchErr(error)
      if (catchMsg) catchMsg(getErrorMsg(error))
      throw error
    })
}
