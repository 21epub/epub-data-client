// TDD first and then enjoy coding !!!
import { DataClient } from '..'
import { AjaxResponse } from 'rxjs/ajax'
import { Observable } from 'rxjs'
import request from '../util/request'
import { generatePromiseResolveMock } from '../util/mockFn'
import { Data } from '../type'

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

const exampleLocalData = [
  {
    no: 20,
    i1: 112,
    openid: 19,
    id: '99910894b550865b04512222',
    modified: '2020-10-06 16:26',
    created: '2020-10-06 16:25'
  }
]

const exampleLocalRawData: Data<any> = {
  page: 3,
  numpages: 10,
  sum: 100,
  size: 20,
  facet: [],
  results: [
    {
      no: 200,
      i1: 1134,
      openid: 190,
      id: '33391082121550865b04512222',
      modified: '2020-10-06 16:26',
      created: '2020-10-06 16:25'
    }
  ]
}

jest.mock('../util/request')

const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

describe('Test DataClient functions', () => {
  const formData = require('../testResults/formData.json')

  test('should FetchAll Data correct ', async () => {
    // fn.mockImplementationOnce(() => 'test')

    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(formData)
    )
    const data = await dataClient.getAll()
    expect(data).toBe(formData.data.results)
  })

  test('should POST PUT PATCH DELETE OPTION correct ', async () => {
    const d = require('../testResults/formSingleData.json')
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('v3/api/h5/works/soskgm/form/objects/12345/data/')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock(d)
    })
    await dataClient.id('12345').path('data/').get()
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
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/5fa50894b550865b04515e71'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData,
        data: {
          ...formData.data,
          results: [{ ...formData.data.results[0], no: 111 }]
        }
      })
    })
    const result = await dataClient
      .current('5fa50894b550865b04515e71')
      .fetchCurrent()

    expect(dataClient.getCurrent()).toBe('5fa50894b550865b04515e71')
    expect(result).toEqual({ ...formData.data.results[0], no: 111 })
    expect(
      dataClient.getData().find((v) => v.id === '5fa50894b550865b04515e71')
    ).toEqual({ ...formData.data.results[0], no: 111 })
  })

  test('should change args pass ', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        '/v3/api/h5/works/soskgm/form/fields/publish/?page=3&query=demo&size=20'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData,
        data: { ...formData.data, page: 3 }
      })
    })
    await dataClient
      .query({
        query: 'demo'
      })
      .url('/v3/api/h5/works/soskgm/form/fields/')
      .page(3)
      .size(20)
      .path('publish/')
      .getAll()

    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/?page=3&query=demo&size=20'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({ ...formData, page: 3 })
    })
    await dataClient.urlReset().getAll()
  })
  test('should local functions pass', async () => {
    expect(dataClient.getRawData()).toBe(formData.data)
    expect(dataClient.getData()).toBe(formData.data.results)
    dataClient.query({
      search: 'demo'
    })
    expect(dataClient.getQuery()).toEqual({
      search: 'demo'
    })
    expect(dataClient.getSize()).toBe(20)
    expect(dataClient.getPage()).toBe(1)
    const newData = {
      no: 2,
      i1: 12,
      openid: 8,
      id: '21210894b550865b04515e71',
      modified: '2020-11-06 16:26',
      created: '2020-11-06 16:25'
    }
    dataClient.appendLocal(newData)
    expect(dataClient.getData()).toEqual([...formData.data.results, newData])
    expect(dataClient.getRawData().sum).toBe(2)
    dataClient.id('21210894b550865b04515e71').patchLocal({
      openid: 9
    })
    expect(
      dataClient.current('21210894b550865b04515e71').fetchCurrentLocal()
    ).toEqual({
      no: 2,
      i1: 12,
      openid: 9,
      id: '21210894b550865b04515e71',
      modified: '2020-11-06 16:26',
      created: '2020-11-06 16:25'
    })
    expect(dataClient.getData()).toEqual([
      ...formData.data.results,
      {
        no: 2,
        i1: 12,
        openid: 9,
        id: '21210894b550865b04515e71',
        modified: '2020-11-06 16:26',
        created: '2020-11-06 16:25'
      }
    ])
    expect(dataClient.getRawData()).toEqual({
      ...formData.data,
      results: [
        ...formData.data.results,
        {
          no: 2,
          i1: 12,
          openid: 9,
          id: '21210894b550865b04515e71',
          modified: '2020-11-06 16:26',
          created: '2020-11-06 16:25'
        }
      ],
      sum: 2
    })
    dataClient.id('21210894b550865b04515e71').deleteLocal()
    expect(dataClient.getData()).toEqual(formData.data.results)
    expect(dataClient.getRawData().sum).toBe(1)
    dataClient.updateLocal(exampleLocalData)
    expect(dataClient.getData()).toEqual(exampleLocalData)
    dataClient.updateRawDataLocal(exampleLocalRawData)
    expect(dataClient.getRawData()).toEqual(exampleLocalRawData)
  })

  test('should change idAttributes and return data is ok', async () => {
    dataClient.options({
      idAttribute: 'slug'
    })

    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock({
        ...formData,
        data: {
          results: [
            {
              no: 2,
              i1: 12,
              openid: 9,
              slug: '21210894b550865b04515e71',
              modified: '2020-11-06 16:26',
              created: '2020-11-06 16:25'
            }
          ]
        }
      })
    )

    await dataClient.current('21210894b550865b04515e71').fetchCurrent()
    dataClient.id('21210894b550865b04515e71').patchLocal({
      no: 4
    })
    const currentData = dataClient.getCurrentData()
    expect(currentData.no).toBe(4)
  })

  test('should getOptions ok', () => {
    const options = dataClient.getOptions()
    expect(options).toEqual({
      acceptMethods: ['POST', 'GET', 'PUT', 'PATCH', 'OPTION', 'DELETE'],
      addBackSlash: false,
      ajaxRequestOptions: {},
      contentType: 'application/json',
      idAttribute: 'slug'
    })
  })

  test('should getMore page data ok', async () => {
    const data = dataClient.getData()
    const newData = {
      no: 10,
      i1: 12,
      openid: 9,
      id: '000',
      modified: '2020-11-06 16:26',
      created: '2020-11-06 16:25'
    }
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/?page=3&search=demo&size=20'
      )
      return generatePromiseResolveMock({
        ...formData,
        data: {
          results: [newData]
        }
      })
    })
    await dataClient.page(3).getMore()
    expect(dataClient.getData()).toEqual([...data, newData])
  })

  test('should Custom getMore callback data handle ok', async () => {
    const data = dataClient.getData()
    const newData = {
      no: 10,
      i1: 12,
      openid: 9,
      id: '000',
      modified: '2020-11-06 16:26',
      created: '2020-11-06 16:25'
    }
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        'v3/api/h5/works/soskgm/form/objects/?page=3&search=demo&size=20'
      )
      return generatePromiseResolveMock({
        ...formData,
        data: {
          results: [newData]
        }
      })
    })
    await dataClient.page(3).getMore({
      parseFn: (prevData, currentData) => {
        return [...currentData, ...prevData]
      }
    })
    expect(dataClient.getData()).toEqual([newData, ...data])
  })
})
