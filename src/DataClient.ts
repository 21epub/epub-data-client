// This data-client mainly serve for Epub360 data api gateway
// All data types will consider the response data is properly match the data case within Epub ENV
// We also provide raw data fn for extend usage

import { AjaxRequest } from 'rxjs/ajax'
import { catchError } from './util/catchError'
import queryString from 'query-string'
import { Observable } from 'rxjs/internal/Observable'
import request from './util/request'
import {
  generateInitData,
  parseData,
  parseRawResponse,
  parseResponse,
  urlJoin
} from './util/util'
import { BehaviorSubject } from 'rxjs'
import { map, reject } from 'ramda'
import { createDataHook } from './util/hooks'
import {
  RequestOpts,
  QueryOpt,
  Data,
  Method,
  AjaxFetcherResponse
} from './type'

/**
 * Data client
 * - First, You shoud know the type of a single Data item , You can use  [MakeTypes](https://jvilk.com/MakeTypes/) to generate
 * - Asume that the single Data item type is
 * ```ts
 * type DataItem = {
 *  openid: number
 *  created: string
 *  i1: number
 *  no: number
 *  modified: string
 *  id: string
 * }
 * ```
 * - Then create a new Client
 * - Asume the client rest url is : http://url.to/data
 * ```ts
 *  const client = new DataClient<DataItem>('http://url.to/data')
 * ```
 * Create with opts to catch error and error msg by default
 * ```ts
 * const opts = {
 *    catchError(error){
 *      if(error.status === 400) message.error(error.response.msg);
 *    },
 *    catchMsg(msg){
 *      message.error(msg)
 *    }
 * }
 * const client = new DataClient<DataItem>('http://url.to/data', opts)
 * ```
 * -
 */
export default class DataClient<T extends { id: string }> {
  /**
   * Url  of data client
   */
  protected _url: string
  /**
   * Origin url of data client , Use with urlReset()
   */
  protected _originUrl: string
  /**
   * _options of data client
   * TODO: acceptMethods:  methods to accept in request
   * contentType: You can change de mode for request
   * addBackSlash: If the url will end with a backSlash
   */
  protected _options: RequestOpts = {
    acceptMethods: ['POST', 'GET', 'PUT', 'PATCH', 'OPTION', 'DELETE'],
    contentType: 'application/json',
    addBackSlash: false
  }

  protected catchError?: typeof catchError
  protected catchMsg?: (msg: string) => void
  protected _size: number | undefined = undefined
  protected _page: number = 1
  protected _numpages: number = 1
  protected _sum: number = 0
  protected _query: QueryOpt = {}
  protected _id: string = ''
  protected _path: string = ''
  protected _current: string = ''
  protected data: T[] | [] = []
  protected rawData: Data<T>
  protected currentData: T | any = {}

  // * -------------------------------- Rxjs Subject define

  public dataLoading$ = new BehaviorSubject(false)
  public currentLoading$ = new BehaviorSubject(false)

  protected rawData$: BehaviorSubject<Data<T>> = new BehaviorSubject<Data<T>>(
    generateInitData()
  )

  protected data$: BehaviorSubject<T[] | []> = new BehaviorSubject<T[] | []>([])
  protected currentData$: BehaviorSubject<T | undefined> = new BehaviorSubject<
    T | undefined
  >(undefined)

  protected query$: BehaviorSubject<RequestOpts> = new BehaviorSubject<
    RequestOpts
  >({})

  // * -------------------------------- Hooks

  /**
   * Hooks of rawData
   * The Demo structure as below:
   * ```json
   *      {
   * "msg": "success",
   * "code": 200,
   * "data": {
   *   "numpages": 1,
   *  "sum": 1,
   *  "results": [
   *    {
   *     "openid": 8,
   *      "created": "2020-11-06 16:25",
   *     "i1": 12,
   *      "no": 1,
   *      "modified": "2020-11-06 16:26",
   *      "id": "5fa50894b550865b04515e71"
   *    }
   *  ],
   *  "facet": [],
   *  "page": 1,
   *  "size": 1
   * }
   *}
   * ```
   * @category Hooks
   * @example
   * ```
   * const Comp = () => {
   *     const {page, sum ,results } = client.useRawData
   * }
   * ```
   */
  public useRawData: () => Data<T> // hooks for rawData
  /**
   *  Hooks of result data
   *  ```json
   * [
   *   {
   *     "openid": 8,
   *     "created": "2020-11-06 16:25",
   *     "i1": 12,
   *     "no": 1,
   *    "modified": "2020-11-06 16:26",
   *    "id": "5fa50894b550865b04515e71"
   *   }
   * ]
   *  ```
   *   @category Hooks
   */
  public useData: () => T[] | [] // hooks for Data
  /**
   * loading statu hooks for Data
   * @category Hooks
   */
  public useDataLoading: () => boolean
  /**
   * loading statu hooks for Current Data
   * @category Hooks
   */
  public useCurrentLoading: () => boolean
  /**
   * Use current data of data client
   * @category Hooks
   */
  public useCurrentData: () => T | undefined
  /**
   * Hooks for get query object
   * Can be used with .query() ,async data change
   * @category Hooks
   * @example
   * ```
   * const {query} = client.useQuery();  // For example
   * ```
   */
  public useQuery: () => RequestOpts

  // * -------------------------------- End of Hooks

  /**
   *
   * @param url
   * @param _options
   * @param initState
   */
  constructor(url: string, opts: RequestOpts = {}, initState: T[] = []) {
    this._url = url
    this._originUrl = url // keep the origin url , changeBack when url change is temporary
    this._options = { ...this._options, ...opts }
    this._size = opts.size ?? this._size
    this.catchError = opts.catchError ?? catchError
    this.catchMsg = opts.catchMsg
    this.data = initState
    this.rawData = generateInitData()
    this.useRawData = createDataHook<Data<T>>(this.rawData$, this.rawData)
    this.useData = createDataHook<T[]>(this.data$, [])
    this.useCurrentData = createDataHook<T | undefined>(
      this.currentData$,
      undefined
    )
    this.useDataLoading = createDataHook<boolean>(this.dataLoading$, false)
    this.useCurrentLoading = createDataHook<boolean>(
      this.currentLoading$,
      false
    )
    this.useQuery = createDataHook<RequestOpts>(this.query$, {})
    return this
  }

  // * --------------------------------  Raw functions

  /**
   * A low level request use as what you want .
   * It return a rxjs/ajax observer
   * @param url
   * @param method
   * @param body
   * @returns rxjs/ajax observer
   */
  public rawAjax(
    url: string,
    method: Method,
    body?: AjaxRequest['body']
  ): Observable<AjaxFetcherResponse<T>> {
    return (request({
      url,
      method,
      headers: {
        'Content-Type': this._options.contentType
      },
      body
    }) as any) as Observable<AjaxFetcherResponse<T>>
  }

  /**
   * A low level request function .
   * Returns a request Promise
   * It will not preserve the return data
   * @param url
   * @param method
   * @param body
   */
  public async rawRequest(
    url: string,
    method: Method,
    body?: AjaxRequest['body']
  ): Promise<void | T[]> {
    return await parseResponse<T>(
      this.rawAjax(url, method, body),
      this.catchError,
      this.catchMsg
    )
  }

  // * -------------------------------- Rest Request functions

  /**
   *  fetch All context datas
   *  preserve the data to this.rawData and this.data
   *  Every fetch success for change the data
   *  ```
   *  await client.getAll()  // will fetch from http://url
   *  await client.getAll().catch(err=> console.log(err))  // fetch for custom error catch
   * ```
   *  You can also change url temporary or make path suffix to the url, id() not support
   * ```
   * await client.url('http://newurl").getAll()  // fetch from url `http://newurl`
   * await client.path('all/').getAll()    // fetch from url  `http://url/all/`
   * ```
   * @category Request Functions
   */
  public async getAll() {
    const query = { size: this._size, page: this._page, ...this._query }
    let url = urlJoin([this._url, this._path], this._options.addBackSlash)
    url = queryString.stringifyUrl({ url, query })
    this.clearIdPath()

    return await parseRawResponse<T>(
      this.rawAjax(url, 'GET'),
      this.catchError,
      this.catchMsg,
      this.dataLoading$
    ).then((data) => {
      if (data) {
        this.rawData = data.response.data as Data<T>
        this.data = parseData(data)
        this._numpages = data.response.data?.numpages ?? 0
        this._page = data.response.data?.page ?? 1
        this._sum = data.response.data?.sum ?? 0
        this.rawData$.next(this.rawData)
        this.data$.next(this.data)
      }
      return this.data
    })
  }

  /**
   *  use to get a single data or other usage
   *  will not preserve the data
   *  ```
   *  await client.id('12345').get()    // get object by id '12345'
   *  ```
   *  @category Request Functions
   */
  public async get() {
    let url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    const query = { size: this._size, page: this._page, ...this._query }
    url = queryString.stringifyUrl({ url: url, query })
    this.clearIdPath()

    return await parseResponse(
      this.rawAjax(url, 'GET'),
      this.catchError,
      this.catchMsg
    )
  }

  /**
   * restful api to post a new object
   * @param body
   * @example
   * ```
   * const result = await client.post({
   * "openid": 8,
   * "created": "2020-11-06 16:25",
   *  "i1": 12,
   *  "no": 1,
   *  "modified": "2020-11-06 16:26",
   *   "id": "5fa50894b550865b04515e71"
   *});
   * ```
   * @category Request Functions
   */
  public async post(body?: AjaxRequest['body']) {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()
    return this.rawRequest(url, 'POST', body)
  }

  /**
   * Rest api to put
   * @param body
   * @example
   * ```ts
   * const result = await client.id('5fa50894b550865b04515e71').put( {
   *     "openid": 8,
   *     "created": "2020-11-06 16:25",
   *     "i1": 12,
   *     "no": 1,
   *     "modified": "2020-11-06 16:26",
   *      "id": "5fa50894b550865b04515e71"
   *   })
   * ```
   * @category Request Functions
   */
  public async put(body?: AjaxRequest['body']) {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()
    return this.rawRequest(url, 'PUT', body)
  }

  /**
   *
   * @param body
   * @category Request Functions
   */
  public async patch(body?: AjaxRequest['body']) {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()
    return this.rawRequest(url, 'PATCH', body)
  }

  /**
   *
   * @param body
   * @example
   * ```
   * await client.id('12345').delete();
   * ```
   * @category Request Functions
   */
  public async delete(body?: AjaxRequest['body']) {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()
    return this.rawRequest(url, 'DELETE', body)
  }

  /**
   *
   * @param body
   * @category Request Functions
   */
  public async option(body?: AjaxRequest['body']) {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()
    return this.rawRequest(url, 'OPTION', body)
  }

  // * -------------------------------- Current Data functions

  /**
   * change current
   * Use it with fetchCurrent to fetch current item's data from server
   * Or use fetchCurrentLocal from this.data
   * @param id
   */
  public current(id: string) {
    this._current = id
    return this
  }

  /**
   *  fetch Current Item data from server
   *  Allowed path suffix
   *  automately preserve data to currentData and this.data
   *  useCurrentData will affected by update
   *  @example
   *  ```
   *  await client.path('object').fetchCurrent()   // will fetch from url http://url/id/object
   *  ```
   */
  public async fetchCurrent(): Promise<T | undefined> {
    let url = urlJoin(
      [this._url, this._current, this._path],
      this._options.addBackSlash
    )
    const query = { size: this._size, page: this._page, ...this._query }
    url = queryString.stringifyUrl({ url: url, query })
    this.clearIdPath()

    return await parseResponse(
      this.rawAjax(url, 'GET'),
      this.catchError,
      this.catchMsg,
      this.currentLoading$
    ).then((data) => {
      if (data && data[0]) {
        this.currentData = data[0]
        this.currentData$.next(this.currentData)
        this.putLocal(this.currentData)
        return data[0]
      } else {
        return undefined
      }
    })
  }

  /**
   *  fetch current data from this.data
   *  @example
   *  ```
   *   client.current('12345').fetchCurrentLocal();
   *  ```
   */
  public fetchCurrentLocal(): T | undefined {
    const id = this._current
    const data = this.data.find((d: T) => d.id === id)
    if (data) {
      this.currentData = data
      this.currentData$.next(this.currentData)
    }
    return data
  }

  // * -------------------------------- Chain Operators

  /**
   *
   * @param opts
   * @category Operators
   */
  public options(opts: RequestOpts = {}): DataClient<T> {
    this._options = {
      ...this._options,
      ...opts
    }
    return this
  }

  /**
   *
   * @param option
   * @category Operators
   */
  public query(option = {}): DataClient<T> {
    this._query = {
      ...option
    }
    this.query$.next(this._query)
    return this
  }

  /**
   *
   * @param p
   * @category Operators
   */
  public page(p: number = 1): DataClient<T> {
    this._page = p
    return this
  }

  /**
   *
   * @param s size / per page to fetch data
   * @category Operators
   */
  public size(s: number = 10) {
    this._size = s
    return this
  }

  /**
   * Change client main url
   * Can reset by this.urlReset()
   * @param u
   * @category Operators
   */
  public url(u: string) {
    this._url = u
    return this
  }

  /**
   *  Reset to origin client url
   *  @category Operators
   */
  public urlReset() {
    this._url = this._originUrl
    return this
  }

  /**
   * id prefix for Request (exclude getAll)
   * always use with request functions
   * @param idString
   * @category Operators
   * @example
   * ```
   *  const result = await client.id('12345').patch({title: '标题'});
   * ```
   */
  public id(idString: string) {
    this._id = idString
    return this
  }

  /**
   *
   * @param p
   * @category Operators
   */
  public path(p: string): DataClient<T> {
    this._path = p
    return this
  }

  // * -------------------------------- methods get properties

  public getRawData() {
    return this.rawData
  }

  public getData() {
    return this.data
  }

  public getCurrent() {
    return this._current
  }

  public getCurrentData() {
    return this.currentData
  }

  public getQuery() {
    return this._query
  }

  // * -------------------------------- local data methods

  public updateLocal(data: T[]) {
    if (data?.length) {
      this.data = [...data]
      this.rawData = {
        ...this.rawData,
        results: this.data
      }
      this.emit$()
    }
    return this.data
  }

  /**
   * Append a single data to the end of the local data list
   * Without any sync with server
   * @param body
   */
  public appendLocal(body: T) {
    if (body) {
      this.data = [...this.data, body]
      this.rawData = {
        ...this.rawData,
        sum: this.rawData.sum + 1,
        results: this.data
      }
      this.emit$()
    }
    return this.data
  }

  public prependLocal(body: T) {
    if (body) {
      this.data = [body, ...this.data]
      this.rawData = {
        ...this.rawData,
        sum: this.rawData.sum + 1,
        results: this.data
      }
      this.emit$()
    }
    return this.data
  }

  public patchLocal(body: Partial<T> = {}) {
    const id = this._id
    this.clearIdPath()
    if (body && id && this.data.find((v: T) => v.id === id)) {
      this.data = map<T[], T[]>((v: any) => {
        if (v.id === id) {
          return { ...v, ...body }
        }
        return v
      }, this.data)
      this.rawData = {
        ...this.rawData,
        results: this.data
      }
      this.emit$()
    }
    if (id && this._current === id && this.currentData?.id === id) {
      this.currentData = { ...this.currentData, ...body }
    }
  }

  public putLocal = this.patchLocal

  public deleteLocal() {
    const id = this._id
    this.clearIdPath()
    if (id && this.data.find((v: T) => v.id === id)) {
      this.data = reject((v: T) => v.id === id, this.data)
      this.rawData = {
        ...this.rawData,
        sum: this.rawData.sum - 1,
        results: this.data
      }
      this.emit$()
    }
    return this.data
  }

  protected emit$() {
    this.rawData$.next(this.rawData)
    this.data$.next(this.data)
  }

  /**
   *  clear Id and path after request
   */
  protected clearIdPath(): void {
    this._id = ''
    this._path = ''
  }
}
