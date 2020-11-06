// TDD first and then enjoy coding !!!
import { DataClient, ObjectClient } from '.'

describe('DataClient For Epub Data RestAPI ', () => {
  it('DataClient Function', async () => {
    const rootClient = new ObjectClient('/v3/api/h5/works/soskgm/form')
    const result = await rootClient.get()
    expect(result).toBe(require('./testResults/form.json'))
    const dataClient = new DataClient('v3/api/h5/works/soskgm/form/objects')
    const results = await dataClient.get()
    expect(results).toBe(require('./testResults/formData.json'))
  })
})
