// data client pro support a custom way to parse the data callback
// but the base function is very similar to DataClient ( offer to fatch origin and single data , and support restFul api interaction)
import { Observable } from 'rxjs'
import { AjaxResponse } from 'rxjs/ajax'
import { DataClientPro } from '../'
import { generatePromiseResolveMock } from '../util/mockFn'
import request from '../util/request'

/* eslint-disable */
export interface Entity {
  id: number
  value_rule: string
  type: string
  info_fields?: string[] | null
  title: string
  slug: string
  start_time?: null
  end_time?: null
  book_slug: string
  created: string
  effective_time: number
  can_assist_yourself: boolean
  value: string
  value_gte: number
  value_lt: number
  value_type: number
  total_assists_num_each_one: number
  total_assists_num_each_one_for_obj: number
  can_assists_num_each_one: number
  can_assists_num_each_one_for_obj: number
  initial_value: string
  need_user_info: boolean
  picture?: null
  rules?: null
}
/* eslint-enable */

export interface RawData {
  count: number
  next: string
  previous?: null
  results?: Entity[]
}

jest.mock('../util/request')

const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

const dataClient = new DataClientPro<RawData, Entity>(
  '/v3/api/h5/works/soskgm/form/objects/',
  {
    parseData: (data?: RawData) => {
      return data?.results
    }
  }
)
const formData = require('../testResults/proCustomData.json')

describe('Test DataClientPro fetch data ', () => {
  test('should fetch data result correctly ', async () => {
    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(formData)
    )

    const result = await dataClient.getAll()
    expect(result).toEqual(formData.results)
  })

  test('should data currectly ', async () => {
    const data = dataClient.getData()
    expect(data).toEqual(formData.results)
  })

  test('should get currentdata ok ', async () => {
    dataClient.current(5)
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData.results.find((v: Entity) => v.id === 5)
      })
    })
    await dataClient.fetchCurrent()
    const current = dataClient.getCurrentData()
    expect(current).toEqual(formData.results.find((d: Entity) => d.id === 5))
  })
})

describe('Test Request Functions ok', () => {
  test('should [get id path] ok', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/5/test')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient.id(5).path('test').get()
  })

  test('should getAll ok ', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        '/v3/api/h5/works/soskgm/form/objects/?page=1&queryText=demo'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient
      .query({
        page: 1,
        queryText: 'demo'
      })
      .getAll()
  })

  test('should put ok ', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/demo/publish')
      expect(opt.method).toBe('PUT')
      return generatePromiseResolveMock({
        ...formData.results[0]
      })
    })
    await dataClient.id('demo').path('publish').put({
      openid: 8,
      created: '2020-11-06 16:25',
      i1: 12,
      no: 1,
      modified: '2020-11-06 16:26'
    })
  })

  test('should post ok ', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/')
      expect(opt.method).toBe('POST')
      return generatePromiseResolveMock({
        ...formData.results[0]
      })
    })
    await dataClient.post({
      openid: 8,
      created: '2020-11-06 16:25',
      i1: 12,
      no: 1,
      modified: '2020-11-06 16:26'
    })
  })

  test('should patch ok', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/10')
      expect(opt.method).toBe('PATCH')
      return generatePromiseResolveMock({
        ...formData.results[0]
      })
    })
    await dataClient.id(10).patch({
      openid: 9,
      modified: '2020-11-06 16:26'
    })
  })

  test('should option ok', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/')
      expect(opt.method).toBe('OPTION')
      return generatePromiseResolveMock({
        ...formData.results[0]
      })
    })
    await dataClient.option({
      rule_num: 0
    })
  })

  test('should delete ok ', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/test')
      expect(opt.method).toBe('DELETE')
      return generatePromiseResolveMock({
        ...formData.results[0]
      })
    })
    await dataClient.id('test').delete()
  })

  test('should fetchCurrent, getCurrent , getCurrentData, fetchCurrentLocal  ok', async () => {
    const expectResult = formData.results.find((v: Entity) => v.id === 5)
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/5')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...expectResult
      })
    })
    const data = await dataClient.current(5).fetchCurrent()
    expect(data).toEqual(expectResult)
    expect(dataClient.getCurrent()).toBe(5)
    const currentData = dataClient.getCurrentData()
    expect(currentData).toEqual(expectResult)
    expect((dataClient.getData() as Entity[]).find((v) => v.id === 5)).toEqual(
      expectResult
    )
    const testFetchLocal = dataClient.current(1).fetchCurrentLocal()
    expect(testFetchLocal).toEqual(
      formData.results.find((v: Entity) => v.id === 1)
    )
  })
})

describe('Test methods and options ok', () => {
  test('should id , path', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/5/test')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient.id(5).path('test').get()
  })

  test('should url and urlReset', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/fields/')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient.url('/v3/api/h5/works/soskgm/form/fields/').get()
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe('/v3/api/h5/works/soskgm/form/objects/')
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient.urlReset().get()
  })

  test('should options', async () => {
    dataClient.options({
      acceptMethods: ['DELETE', 'GET']
    })
    expect(dataClient.getOptions().acceptMethods).toEqual(['DELETE', 'GET'])
  })

  test('should query', async () => {
    mockRequest.mockImplementationOnce((opt) => {
      expect(opt.url).toBe(
        '/v3/api/h5/works/soskgm/form/objects/?page=1&size=20'
      )
      expect(opt.method).toBe('GET')
      return generatePromiseResolveMock({
        ...formData
      })
    })
    await dataClient
      .query({
        page: 1,
        size: 20
      })
      .getAll()
  })
})

describe('Should Local modification ok', () => {
  test('should update local data ok', async () => {
    const newData = [...formData.results, { ...formData.results[0], id: 6 }]
    dataClient.updateLocal(newData)
    expect(
      (dataClient.getData() as Entity[]).find((v) => v.id === 6)
    ).toBeTruthy()
    dataClient.updateRawDataLocal({ ...formData, results: newData })
    expect(dataClient.getRawData()).toEqual({ ...formData, results: newData })
  })
})

describe('If parseData exist , and the returned data not match the parseData , then The Error will return ', async () => {
  const parseDataClientDemo = new DataClientPro('/v3/api/data', {
    parseData: (rawData?: any) => rawData.results,
    catchError: (error) => {
      expect(error.response.code).toBe(400)
    },
    catchMsg: (msg) => {
      expect(msg).toBe('这是一个虚拟的错误测试')
    }
  })
  mockRequest.mockImplementationOnce((opt) => {
    expect(opt.url).toBe('/v3/api/data')
    expect(opt.method).toBe('GET')
    return generatePromiseResolveMock({
      code: 400,
      msg: '这是一个虚拟的错误测试',
      data: {
        demo: 1
      }
    })
  })
  await parseDataClientDemo.getAll()
})
