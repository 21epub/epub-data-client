import { AjaxFetcherResponse } from '../type'
import { parseData, urlJoin } from '../util/util'
import { debounce, throttle } from '../'

test('should url join correct', () => {
  const url = urlJoin(['/v3/api/works', '12345'])
  expect(url).toBe('/v3/api/works/12345/')

  const url2 = urlJoin(['/v3/api/works/', '12345'])
  expect(url2).toBe('/v3/api/works/12345/')

  const url3 = urlJoin(['/v3/api/works', ''])
  expect(url3).toBe('/v3/api/works/')

  const url4 = urlJoin(['/v3/api/works'], false)
  expect(url4).toBe('/v3/api/works')

  const url5 = urlJoin(['/v3/api/works', '12345'], false)
  expect(url5).toBe('/v3/api/works/12345')
})

test('should parse data correct ', () => {
  const formData = require('../testResults/formData.json')
  const responseData = {
    response: formData
  } as AjaxFetcherResponse<any>
  const result = parseData(responseData)
  expect(result).toBe(formData.data.results)
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('debounce fn Ok', async () => {
  let result = 0
  const deBouncedFn = debounce((n: number) => {
    result += n
  }, 200)
  deBouncedFn(1)
  deBouncedFn(1)
  deBouncedFn(1)
  expect(result).toBe(0)
  await sleep(200)
  deBouncedFn(5)
  expect(result).toBe(1)
  await sleep(200)
  expect(result).toBe(6)
})

test('throttle fn pass', async () => {
  let result = 0
  const deBouncedFn = throttle((n: number) => {
    result += n
  }, 100)
  deBouncedFn(1)
  deBouncedFn(1)
  deBouncedFn(1)
  expect(result).toBe(1)
  await sleep(50)
  expect(result).toBe(1)
  deBouncedFn(2)
  expect(result).toBe(1)
  await sleep(50)
  deBouncedFn(5)
  expect(result).toBe(6)
  deBouncedFn(5)
  await sleep(50)
  expect(result).toBe(6)
})
