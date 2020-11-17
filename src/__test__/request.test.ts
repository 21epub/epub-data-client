/**
 * @jest-environment node
 */

import { Observable } from 'rxjs'
import { AjaxResponse } from 'rxjs/ajax'
import { DataClient } from '..'
import {
  generatePromiseRejectMock,
  generatePromiseResolveMock
} from '../util/mockFn'
import request from '../util/request'

jest.mock('../util/request')
const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

test('Test request in node env', async () => {
  expect(typeof XMLHttpRequest).toBe('undefined')
  const url = 'https://jsonplaceholder.typicode.com/todos/1'
  mockRequest.mockImplementationOnce(() =>
    generatePromiseResolveMock({
      userId: 1,
      id: 1,
      title: 'delectus aut autem',
      completed: false
    })
  )
  const data = await request({
    url,
    method: 'GET'
  }).toPromise()
  expect(data.response.id).toBe(1)
})

const mockData = {
  message: 'ajax error 404',
  name: 'AjaxError',
  response: {},
  responseType: 'json',
  status: 404
}

test('Response Error ', async () => {
  const url = 'https://jsonplaceholder.typicode.com/todos/'
  const client = new DataClient(url, {
    catchMsg(msg) {
      expect(msg).toBe('ajax error 404')
    },
    ajaxRequestOptions: {
      timeout: 1000
    }
  })
  mockRequest.mockImplementation(() => generatePromiseRejectMock(mockData))
  await client
    .id('22222')
    .get()
    .catch((error) => {
      expect(error.status).toBe(404)
    })
  // .catch((error) => {
  //   //expect(error.status).toBe(404)
  // })
})
