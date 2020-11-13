// TDD first and then enjoy coding !!!
import { DataClient } from '..'
import { AjaxResponse } from 'rxjs/ajax'
import { Observable } from 'rxjs'
import request from '../util/request'
import { generatePromiseResolveMock } from '../util/mockFn'

type DataItem = {
  openid: number
  created: string
  i1: number
  no: number
  modified: string
  id: string
}
// const rootClient = new ObjectClient('/v3/api/h5/works/soskgm/form')
const dataClient = new DataClient<DataItem>(
  'v3/api/h5/works/soskgm/form/objects/'
)

jest.mock('../util/request')

const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

describe('Test DataClient functions', () => {
  test('should FetchAll Data correct ', async () => {
    // fn.mockImplementationOnce(() => 'test')
    const formData = require('../testResults/formData.json')

    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(formData)
    )
    const data = await dataClient.getAll()
    expect(data).toBe(formData.data.results)
  })

  test('should POST PUT PATCH DELETE OPTION correct ', async () => {
    const d = require('../testResults/formSingleData.json')
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('v3/api/h5/works/soskgm/form/objects/test')
      expect(opt.method).toBe('POST')
      return generatePromiseResolveMock(d)
    })
    const data = await dataClient.id('test').post({})
    expect(data).toBe(d.data.results)
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.method).toBe('PUT')
      return generatePromiseResolveMock(d)
    })
    await dataClient.id('test').put({})
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.method).toBe('PATCH')
      return generatePromiseResolveMock(d)
    })
    await dataClient.id('test').patch({})
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.method).toBe('DELETE')
      return generatePromiseResolveMock(d)
    })
    await dataClient.id('12345').delete()
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.method).toBe('OPTION')
      return generatePromiseResolveMock(d)
    })
    await dataClient.option({})
  })

  test('should current Functions pass ', async () => {
    const formData = require('../testResults/formData.json')
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/test1111?page=1'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock(formData)
    })
    const result = await dataClient.current('test1111').fetchCurrent()

    expect(dataClient.getCurrent()).toBe('test1111')
    expect(result).toBe(formData.data.results[0])
  })

  test('should change args pass ', async () => {
    const formData = require('../testResults/formData.json')
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        '/v3/api/h5/works/soskgm/form/fields/1111/publish/?page=3&query=demo&size=20'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock(formData)
    })
    await dataClient
      .query({
        query: 'demo'
      })
      .url('/v3/api/h5/works/soskgm/form/fields/')
      .page(3)
      .size(20)
      .id('1111')
      .path('publish/')
      .get()

    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/?page=3&query=demo&size=20'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock(formData)
    })
    await dataClient.urlReset().get()
  })
  test('should local functions pass', async () => {
    const formData = require('../testResults/formData.json')
    expect(dataClient.getRawData()).toBe(formData.data)
    expect(dataClient.getData()).toBe(formData.data.results)
    dataClient.query({
      search: 'demo'
    })
    expect(dataClient.getQuery()).toEqual({
      search: 'demo'
    })
  })
})
