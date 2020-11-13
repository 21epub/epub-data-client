import { AjaxError, AjaxResponse } from 'rxjs/ajax'

export interface Data<T> {
  numpages: number
  sum: number
  page: number
  size: number
  facet?: any[]
  results: T[]
}
export interface FetcherData<T> {
  msg: string
  code: number
  data?: Data<T>
}
export interface AjaxFetcherResponse<T> extends AjaxResponse {
  response: FetcherData<T>
}

export type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'OPTION' | 'PATCH'

export type RequestOpts = {
  /**
   * Methods allowed To use
   */
  acceptMethods?: Array<Method>
  contentType?:
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data'
    | 'application/json'
    | 'text/plain'
  /**
   * catchError for both http response error and data.code!=200 error
   */
  catchError?: (error: AjaxError) => void
  /**
   * catchMsg return by error response msg or default system msg
   */
  catchMsg?: (msg: string) => void
  /**
   *  size for request per page
   */
  size?: number
  /**
   *  Force to Add slash at the end of parsed url (default is false)
   *  @example
   *  ```
   *    Turn `http://url.to/1234`  to `http://url.to/1234/`
   *  ```
   */
  addBackSlash?: boolean
}

export type QueryOpt = {
  size?: number
  page?: number
  query?: string
  [k: string]: string | number | undefined
}
