import { Observable, of } from 'rxjs'
import { AjaxResponse } from 'rxjs/ajax'

export const generatePromiseResolveMock = <T>(
  data: T
): Observable<AjaxResponse> => {
  const d = {
    response: data
  } as any
  return of(d)
}
