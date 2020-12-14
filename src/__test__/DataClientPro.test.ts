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

  test('should put ok ', async () => {})

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

  test('should patch ok', async () => {})

  test('should option ok', async () => {})

  test('should delete ok ', async () => {})

  test('should fetchCurrent ok', async () => {})
})

describe('Test methods and options ok', () => {
  test('should id', async () => {})

  test('should path', async () => {})

  test('should url and urlReset', async () => {})

  test('should options', async () => {})

  test('should query', async () => {})
})

describe('Should Local modification ok', () => {
  test('should update local data ok', async () => {})
})
