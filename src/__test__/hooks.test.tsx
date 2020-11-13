import { DataClient } from '..'
import { AjaxResponse } from 'rxjs/ajax'
import { Observable } from 'rxjs'
import request from '../util/request'
import { generatePromiseResolveMock } from '../util/mockFn'
import React from 'react'
import { render } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

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

const Component1 = () => {
  const data = dataClient.useData()

  return <>Id: {data[0]?.id}</>
}

const Component2 = () => {
  const data = dataClient.useRawData()

  return <>Id: {data.results[0]?.id}</>
}

jest.mock('../util/request')
const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

describe('Test hooks for DataClient', () => {
  test('should useRawData hooks ok', async () => {
    const comp1 = render(<Component1 />)
    const comp2 = render(<Component2 />)
    expect(comp1.container.innerHTML).toBe('Id: ')
    const formData = require('../testResults/formData.json')

    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(formData)
    )
    await act(async () => {
      await dataClient.getAll()
    })
    expect(comp1.container.innerHTML).toBe('Id: ' + formData.data.results[0].id)
    expect(comp2.container.innerHTML).toBe('Id: ' + formData.data.results[0].id)
  })
})
