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
  ParseFnForLoadMore,
  parseFnForLoadMore,
  parseRawResponse,
  parseResponse,
  urlJoin
} from './util/util'
import { BehaviorSubject } from 'rxjs'
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
 * - Causion First: Every api using this module should fit the response data structure as below
 * - ```json
 *  {
   "msg": "success",
   "code": 200,
   "data": {
     "numpages": 1,
     "sum": 1,
     "results": [
       {
         "openid": 8,
         "created": "2020-11-06 16:25",
         "i1": 12,
         "no": 1,
         "modified": "2020-11-06 16:26",
         "id": "5fa50894b550865b04515e71"
       }
     ],
     "facet": [],
     "page": 1,
     "size": 1
   }
 }
 * - ```
 * - First, You shoud know the type of a single Data item typed <T> , You can use  [MakeTypes](https://jvilk.com/MakeTypes/) to generate
 * - Asume that the single Data item type is
 * ```ts
 *  type DataItem = {
 *    openid: number
 *    created: string
 *    i1: number
 *    no: number
 *    modified: string
 *    id: string
 *  }
 * ```
 * - Then create a new Client
 * - Asume the client rest url is : http://url.to/data
 * ```ts
 *  import { DataClient } from '@21epub/epub-data-client'
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
export default class DataClient<T extends Record<string, any>> {
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
    addBackSlash: false,
    ajaxRequestOptions: {},
    idAttribute: 'id'
  }

  protected catchError?: typeof catchError
  protected catchMsg?: (msg: string) => void
  protected _size: number | undefined = undefined
  protected _page: number = 1
  protected _numpages: number = 1
  protected _sum: number = 0
  protected _query: QueryOpt = {}
  protected _id: string | number = ''
  protected _path: string = ''
  protected _current: string | number = ''
  protected data: T[] = []
  protected rawData: Data<T>
  protected currentData: T | any = {}
  protected _idAttribute: string = 'id'

  // * -------------------------------- Rxjs Subject define

  /**
   * Data loading$ rxjs/BehaviorSubject
   * Custom trigger dataLoading$ state
   * Automatically trigger by getAll()
   * @example
   * ```ts
   *  dataLoading$.next(true);
   *  ...
   *  dataLoading$.next(false);
   *
   * ```
   * Use with hooks
   * ```tsx
   *  const Comp = () => {
   *    const dataLoading = client.useDataLoading();
   *    return (
   *       <>
   *         {dataLoading? <spin/> : <Table/>}
   *       </>
   *    )
   *  }
   * ```
   */
  public dataLoading$ = new BehaviorSubject(false)
  /**
   * CurrentData loading rxjs subject
   * Custom trigger on demand
   * Use with fetchCurrent() automatically
   */
  public currentLoading$ = new BehaviorSubject(false)

  protected rawData$: BehaviorSubject<Data<T>> = new BehaviorSubject<Data<T>>(
    generateInitData()
  )

  protected data$: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([])
  protected currentData$: BehaviorSubject<T | undefined> = new BehaviorSubject<
    T | undefined
  >(undefined)

  protected query$: BehaviorSubject<QueryOpt> = new BehaviorSubject<QueryOpt>(
    {}
  )

  // * -------------------------------- Hooks

  /**
   * Hooks of rawData
   * The Demo rawData structure as below:
   * ```json
   *  {
   *      "numpages": 1,
   *      "sum": 1,
   *      "results": [
   *        {
   *          "openid": 8,
   *          "created": "2020-11-06 16:25",
   *          "i1": 12,
   *          "no": 1,
   *          "modified": "2020-11-06 16:26",
   *          "id": "5fa50894b550865b04515e71"
   *        }
   *      ],
   *      "facet": [],
   *      "page": 1,
   *      "size": 1
   *  }
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
   *  Data structure as below:
   *  ```json
   * [
   *   {
   *     "openid": 8,
   *     "created": "2020-11-06 16:25",
   *     "i1": 12,
   *     "no": 1,
   *     "modified": "2020-11-06 16:26",
   *     "id": "5fa50894b550865b04515e71"
   *   }
   * ]
   *  ```
   *   @category Hooks
   */
  public useData: () => T[] // hooks for Data
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
   * Current data is an object as below
   * ```json
   * {
        "i1": 12,
        "openid": 8,
        "id": "5fa50894b550865b04515e71",
        "modified": "2020-11-06 16:26",
        "created": "2020-11-06 16:25"
      }
   * ```
   * @category Hooks
   * 
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
  public useQuery: () => QueryOpt

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
    this.useQuery = createDataHook<QueryOpt>(this.query$, {})
    this._idAttribute = opts.idAttribute ?? 'id'
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
      body,
      ...this._options.ajaxRequestOptions
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
   *  getAll() with page , size and query arguments
   * ```
   *  await client.page(2).size(20).query({query:"demo"}).getAll() ;
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
   *  fetch more context datas from server
   *  append these data to this.data
   *  preserve the data to this.rawData and this.data
   *  Every fetch success for change the data
   *  Scroll a container to load more page datas
   *  ```
   *  await client.page(2).getMore()  // will fetch from http://url
   *  await client.getMore()   // not page params , asume this._page is 1 , then it will automatically load data from page 2
   *  await client.getMore().catch(err=> console.log(err))  // fetch for custom error catch
   * ```
   *  You can also change url temporary or make path suffix to the url, id() not support
   * ```
   * await client.url('http://newurl").getMore()  // fetch from url `http://newurl`
   * await client.path('all/').getMore()    // fetch from url  `http://url/all/`
   * ```
   *  getMore() with page , size and query arguments
   * ```
   *  await client.page(2).size(20).query({query:"demo"}).getMore() ;
   * ```
   * @category Request Functions
   * @param parseFn Custom the methods to handle the data callback , You can append or prepend the data to origin or make any validation
   * @example
   * You can custom your data parse function
   * ```ts
   *   await dataClient.page(3).getMore({
   *    parseFn: (prevData, currentData) => {
   *     return [...currentData, ...prevData]
   *    }
   *  })
   * ```
   */
  public async getMore({ parseFn }: { parseFn?: ParseFnForLoadMore } = {}) {
    const query = {
      size: this._size,
      page: this._page,
      ...this._query
    }
    const parseLoadFn = parseFn ?? parseFnForLoadMore
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
        const newResults = parseLoadFn<T>(this.data, parseData(data))
        this.data = newResults
        this.rawData = {
          ...data.response.data,
          results: newResults
        } as Data<T>
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
   *  Current Catch after request
   *  ```
   *  await client.id('12345').get().catch(err => console.log(error.response.msg))
   *  ```
   *  @category Request Functions
   */
  public async get() {
    const url = urlJoin(
      [this._url, this._id, this._path],
      this._options.addBackSlash
    )
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
   *  "openid": 8,
   *  "created": "2020-11-06 16:25",
   *  "i1": 12,
   *  "no": 1,
   *  "modified": "2020-11-06 16:26"
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
   * Patch partial data to server
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
   * Id params will be cleared after using.
   * @param id
   */
  public current(id: string | number) {
    this._current = id
    return this
  }

  /**
   *  fetch Current Item data from server
   *  Allowed path suffix
   *  automately preserve data to this._currentData and this.data
   *  useCurrentData will affected by update
   *  @example
   *  ```
   *  await client.path('object').fetchCurrent()   // will fetch from url http://url/id/object
   *  ```
   *  @category Request Functions
   */
  public async fetchCurrent(): Promise<T | undefined> {
    const url = urlJoin(
      [this._url, this._current, this._path],
      this._options.addBackSlash
    )
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
        this.id(this._current).putLocal(this.currentData)
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
    const data = this.data.find((d: T) => (d as any)[this._idAttribute] === id)
    if (data) {
      this.currentData = data
      this.currentData$.next(this.currentData)
    }
    return data
  }

  // * -------------------------------- Chain Operators

  /**
   * change Request options
   * @param opts
   * @category Chain Operators
   */
  public options(opts: RequestOpts = {}): DataClient<T> {
    this._options = {
      ...this._options,
      ...opts
    }
    if (opts.idAttribute) this._idAttribute = opts.idAttribute
    return this
  }

  /**
   * Set the query args only for getAll function
   * * Notice: This is a Operator only for getAll method , other method not care *
   * @param q
   * @category Chain Operators
   */
  public query(q = {}): DataClient<T> {
    this._query = {
      ...q
    }
    this.query$.next(this._query)
    return this
  }

  /**
   * Set page for getAll() only
   * * Notice: This is a Operator only for getAll method , other method not care *
   * @param p
   * @category Chain Operators
   * @example
   * ```
   *  await dataClient.page(2).getAll();
   * ```
   */
  public page(p: number = 1): DataClient<T> {
    this._page = p
    return this
  }

  /**
   * Set size only for getAll()
   * * Notice: This is a Operator only for getAll method , other method not care *
   * @param s size / per page to fetch data
   * @category Chain Operators
   * @example
   * ```
   *  await dataClient.page(3).size(20).getAll();
   * ```
   */
  public size(s: number = 10) {
    this._size = s
    return this
  }

  /**
   * Change client main url
   * Can reset by this.urlReset()
   * @param u
   * @category Chain Operators
   */
  public url(u: string) {
    this._url = u
    return this
  }

  /**
   *  Reset to origin client url
   *  @category Chain Operators
   */
  public urlReset() {
    this._url = this._originUrl
    return this
  }

  /**
   * id prefix for Request (exclude getAll)
   * always use with request functions
   * @param idString
   * @category Chain Operators
   * @example
   * ```
   *  const result = await client.id('12345').patch({title: '标题'});
   * ```
   */
  public id(idString: string | number) {
    this._id = idString
    return this
  }

  /**
   * Set path suffix for all request
   * Path will be cleared after usage
   * @param p
   * @category Chain Operators
   * @example
   * ```
   *  await dataClient.id('12345').path('publish/').post();
   * ```
   */
  public path(p: string): DataClient<T> {
    this._path = p
    return this
  }

  // * -------------------------------- methods get properties

  /**
   *  @category Get Local Data Or Settings
   */
  public getRawData() {
    return this.rawData
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getData() {
    return this.data
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getCurrent() {
    return this._current
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getCurrentData() {
    return this.currentData
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getQuery() {
    return this._query
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getOptions() {
    return this._options
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getUrl() {
    return this._url
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getSize() {
    return this._size
  }

  /**
   * @category Get Local Data Or Settings
   */
  public getPage() {
    return this._page
  }

  // * -------------------------------- local data methods

  /**
   * Update all Raw data locally
   * @param rawData
   * @category Local Data Modification
   */
  public updateRawDataLocal(rawData: Data<T>) {
    if (rawData && rawData.results) {
      this.rawData = {
        ...this.rawData,
        ...rawData
      }
      this.emit$()
    }
    return this.rawData
  }

  /**
   * Update all data locally
   * !Caution: This function only changes the data list without modify the 'sum' value
   * @param data
   * @category Local Data Modification
   */
  public updateLocal(data: T[] = []) {
    this.data = [...data]
    this.rawData = {
      ...this.rawData,
      results: this.data
    }
    this.emit$()
    return this.data
  }

  /**
   * Append a single data to the end of the local data list
   * Without any sync with server
   * @param body
   * @category Local Data Modification
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

  /**
   *
   * @param body
   * @category Local Data Modification
   */
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

  /**
   * Patch a local data object value without sync server request
   * @param body
   * @category Local Data Modification
   */
  public patchLocal(body: Partial<T> = {}) {
    const id = this._id
    this.clearIdPath()
    if (body && id && this.data.find((v: T) => v[this._idAttribute] === id)) {
      const d = this.data.map((v) => {
        if (v[this._idAttribute] === id) {
          return { ...v, ...body }
        }
        return v
      })
      this.data = [...d]
      this.rawData = {
        ...this.rawData,
        results: this.data
      }
      this.emit$()
    }
    if (
      id &&
      this._current === id &&
      this.currentData[this._idAttribute] === id
    ) {
      this.currentData = { ...this.currentData, ...body }
    }
  }

  /**
   *
   * @param body
   * @category Local Data Modification
   */
  public putLocal = (body: Partial<T> = {}) => {
    return this.patchLocal(body)
  }

  /**
   * Delete a single Data from local
   * @category Local Data Modification
   * @example
   * Delete a dataobject of id === '12345'
   * ```
   *  client.id('12345').deleteLocal();
   * ```
   */
  public deleteLocal() {
    const id = this._id
    this.clearIdPath()
    if (id && this.data.find((v: T) => v[this._idAttribute] === id)) {
      this.data = [...this.data.filter((v: T) => v[this._idAttribute] !== id)]
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
