import { Observable, of, throwError } from 'rxjs'
import { AjaxResponse } from 'rxjs/ajax'

/**
 * For jest mock
 * @param data
 */
export const generatePromiseResolveMock = <T>(
  data: T
): Observable<AjaxResponse> => {
  const d = {
    response: data
  } as any
  return of(d)
}

export const generatePromiseRejectMock = <T>(
  data: T
): Observable<AjaxResponse> => {
  return throwError(data)
}
