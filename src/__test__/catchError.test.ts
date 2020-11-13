import { getErrorMsg } from '../util/catchError'
import { AjaxError } from 'rxjs/ajax'

describe('Test for catchError', () => {
  test('should getErrorMsg correctly', () => {
    let responseError = {
      response: {
        msg: 'This is a error',
        code: 400
      }
    } as AjaxError
    let result = getErrorMsg(responseError)
    expect(result).toBe(responseError.response.msg)
    responseError = {
      response: {
        code: 400
      }
    } as AjaxError
    result = getErrorMsg(responseError)
    expect(result).toBe('请求失败，请检查网络，并重试')
    responseError = {
      response: {
        msg: 'This is a error response'
      },
      status: 400
    } as AjaxError
    result = getErrorMsg(responseError)
    expect(result).toBe(responseError.response.msg)
  })
})
