import { AjaxFetcherResponse } from '../type'
import { parseData, urlJoin } from '../util/util'

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
