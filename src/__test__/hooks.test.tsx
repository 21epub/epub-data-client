import { DataClient, DataClientPro } from '..'
import { AjaxResponse } from 'rxjs/ajax'
import { Observable } from 'rxjs'
import request from '../util/request'
import { generatePromiseResolveMock } from '../util/mockFn'
import React from 'react'
import { render } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { Entity, RawData } from './DataClientPro.test'

// const rootClient = new ObjectClient('/v3/api/h5/works/soskgm/form')

jest.mock('../util/request')
const mockRequest = request as jest.Mock<Observable<AjaxResponse>>

describe('Test hooks for DataClient', () => {
  type DataItem = {
    openid: number
    created: string
    i1: number
    no: number
    modified: string
    id: string
  }

  const dataClient = new DataClient<DataItem>(
    'v3/api/h5/works/soskgm/form/objects/'
  )

  const Component1 = () => {
    const data = dataClient.useData()

    return <>Id: {data[0]?.id}</>
  }

  const Component2 = () => {
    const data = dataClient.useRawData()

    return <>Id: {data?.results[0]?.id}</>
  }

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

describe('Test hooks for DataClientPro', () => {
  const dataClient = new DataClientPro<RawData, Entity>(
    'v3/api/h5/works/soskgm/form/objects/',
    {
      parseData: (data?: RawData) => {
        return data?.results
      }
    }
  )
  const formData = require('../testResults/proCustomData.json')

  const Component1 = () => {
    const data = dataClient.useData()

    return <>Id: {data[0]?.id}</>
  }

  const Component2 = () => {
    const data = dataClient.useRawData()

    return <>Id: {data?.results && (data?.results as Entity[])[0]?.id}</>
  }

  test('should useData ok', async () => {
    const comp1 = render(<Component1 />)
    const comp2 = render(<Component2 />)
    expect(comp1.container.innerHTML).toBe('Id: ')

    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(formData)
    )
    await act(async () => {
      await dataClient.getAll()
    })
    expect(comp1.container.innerHTML).toBe('Id: ' + formData.results[0].id)
    expect(comp2.container.innerHTML).toBe('Id: ' + formData.results[0].id)
  })

  test('should useCurrentData', async () => {
    mockRequest.mockImplementationOnce(() =>
      generatePromiseResolveMock(
        formData.results.find((v: Entity) => v.id === 5)
      )
    )

    const ComponentCurrent = () => {
      const data = dataClient.useCurrentData()

      return <>Id: {data?.id}</>
    }

    const comp1 = render(<ComponentCurrent />)

    await act(async () => {
      await dataClient.current(5).fetchCurrent()
    })

    expect(comp1.container.innerHTML).toBe('Id: ' + 5)
  })
})
