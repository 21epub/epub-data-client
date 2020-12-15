// This data-client mainly serve for Epub360 data api gateway
// All data types will consider the response data is properly match the data case within Epub ENV
// We also provide raw data fn for extend usage

import { AjaxRequest } from 'rxjs/ajax'
import { catchError } from './util/catchError'
import queryString from 'query-string'
import { Observable } from 'rxjs/internal/Observable'
import request from './util/request'
import { parseResponsePro, urlJoin } from './util/util'
import { BehaviorSubject } from 'rxjs'
import { createDataHook } from './util/hooks'
import {
  RequestOptsPro,
  QueryOpt,
  Method,
  AjaxResponsePro,
  ProParseDataFC
} from './type'

/**
 * Data client Pro ( More Customized solution for different api server )
 * - Api data structure are not restricted , or some Demo like below : 
 * - ```json
 *  {
    "count": 30,
    "next": "http://127.0.0.1:8000/api/assistance/?limit=10&offset=10",
    "previous": null,
     "results": [
       {
         "openid": 8,
         "created": "2020-11-06 16:25",
         "i1": 12,
         "no": 1,
         "modified": "2020-11-06 16:26",
         "id": "5fa50894b550865b04515e71"
       }
     ]
   }
 * - ```
 * - First, You shoud know the type of the RawData from server <D>  and a single Data item typed <T> , You can use  [MakeTypes](https://jvilk.com/MakeTypes/) to generate
 * - Asume that your rawData type is 
 * ```ts
 * type RawData = {
 *    count: number
 *    next?: string
 *    previous?: string
 *    results: DataItem[]
 * }
 * ```
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
 * - You should specify the `parseData` method for data parsing , parseData is a parser to handle the return data,  for example: 
 * - parseData method is only worked for `getAll` to parse the results 
 * ```ts
 * const opts = {
 *  parseData: (rawData: RawData):DataItem[] => {
 *     return rawData.results; 
 *  }
 * }
 * ```
 * - Then create a new Client
 * - Asume the client rest url is : http://url.to/data
 * - type D means rawData from response 
 * - type T means single Data Item for Data list 
 * ```ts
 *  import { DataClientPro } from '@21epub/epub-data-client'
 *  const client = new DataClientPro<RawData , DataItem>('http://url.to/data', opts)
 * ```
 * Create with opts to catch error and error msg by default
 * ```ts
 * const opts = {
 *    parseData: (rawData: RawData):DataItem[] => {
 *       return rawData.results; 
 *    }
 *    catchError(error){
 *      if(error.status === 400) message.error(error.response.msg);
 *    },
 *    catchMsg(msg){
 *      message.error(msg)
 *    }
 * }
 * const client = new DataClientPro<DataItem>('http://url.to/data', opts)
 * ```
 * -
 */
export default class DataClientPro<D, T extends Record<string, any>> {
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
  protected _options: RequestOptsPro<D, T> = {
    acceptMethods: ['POST', 'GET', 'PUT', 'PATCH', 'OPTION', 'DELETE'],
    contentType: 'application/json',
    addBackSlash: false,
    ajaxRequestOptions: {},
    idAttribute: 'id'
  }

  protected catchError?: typeof catchError
  protected catchMsg?: (msg: string) => void
  protected _query: QueryOpt = {}
  protected _id: string | number = ''
  protected _path: string = ''
  protected _current: string | number = ''
  protected data: D | T | T[] | undefined
  protected rawData: D | undefined
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

  protected rawData$: BehaviorSubject<D | undefined> = new BehaviorSubject<
    D | undefined
  >(undefined)

  protected data$: BehaviorSubject<T[]> = new BehaviorSubject<T[]>([])
  protected currentData$: BehaviorSubject<T | undefined> = new BehaviorSubject<
    T | undefined
  >(undefined)

  protected query$: BehaviorSubject<QueryOpt> = new BehaviorSubject<QueryOpt>(
    {}
  )

  /**
   * Parse data of data client pro
   * parseData only for getAll to parse the server data
   * Initialize it from contructor function
   * @example
   * ```ts
   * parseData : (rawData? : RawData) => rawData.results
   * ```
   */
  public parseData?: ProParseDataFC<D, T>

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
   * And then you can use the data as you wish
   * @category Hooks
   * @example
   * ```ts
   * const Comp = () => {
   *     const {page, sum ,results } = client.useRawData
   * }
   * ```
   */
  public useRawData: () => D | undefined // hooks for rawData
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
  public useCurrentData: () => any | undefined
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
  constructor(
    url: string,
    opts: RequestOptsPro<D, T> = {},
    initState: T[] = []
  ) {
    this._url = url
    this._originUrl = url // keep the origin url , changeBack when url change is temporary
    this._options = { ...this._options, ...opts }
    this.catchError = opts.catchError ?? catchError
    this.catchMsg = opts.catchMsg
    this.data = initState
    this.useRawData = createDataHook<D | undefined>(this.rawData$, this.rawData)
    this.useData = createDataHook<T[]>(this.data$, [])
    this.useCurrentData = createDataHook<any | undefined>(
      this.currentData$,
      undefined
    )
    this.useDataLoading = createDataHook<boolean>(this.dataLoading$, false)
    this.useCurrentLoading = createDataHook<boolean>(
      this.currentLoading$,
      false
    )
    this.useQuery = createDataHook<QueryOpt>(this.query$, {})
    this.parseData = opts.parseData
    this._idAttribute = opts.idAttribute ?? 'id'
    return this
  }

  // * --------------------------------  Raw functions

  private _getRequestArgs(
    url: string,
    method: Method,
    body?: AjaxRequest['body']
  ) {
    return {
      observer: this.rawAjax(url, method, body),
      catchErr: this.catchError,
      catchMsg: this.catchMsg,
      parseData: this?.parseData
    }
  }

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
  ): Observable<AjaxResponsePro<D>> {
    return (request({
      url,
      method,
      headers: {
        'Content-Type': this._options.contentType
      },
      body,
      ...this._options.ajaxRequestOptions
    }) as any) as Observable<AjaxResponsePro<D>>
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
  ): Promise<void | T[] | D | T | any> {
    return await parseResponsePro<D, T>({
      ...this._getRequestArgs(url, method, body),
      parseData: undefined
    }).then((data) => {
      return data
    })
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
   * Result will be prased by `parseData`
   * @category Request Functions
   */
  public async getAll() {
    const query = { ...this._query }
    let url = urlJoin([this._url, this._path], this._options.addBackSlash)
    url = queryString.stringifyUrl({ url, query })
    this.clearIdPath()

    return await parseResponsePro<D, T>({
      ...this._getRequestArgs(url, 'GET'),
      loading$: this.dataLoading$
    }).then((data) => {
      if (data) {
        this.rawData = data
        this.data = this.parseData ? this.parseData(data) : data
        this.rawData$.next(this.rawData)
        this.data$.next(this.data as T[])
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

    return await this.rawRequest(url, 'GET')
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
   *  automately preserve data to this._currentData
   *  useCurrentData will affected by update
   *  !Caution: `parseData` will not Effect this method
   *  !Caution: Not like DataClient , Because the dataStructure maybe different , So data list may not be updated only if the return data fit the structure of a single item
   *  @example
   *  ```
   *  await client.path('object').fetchCurrent()   // will fetch from url http://url/id/object
   *  ```
   *  @category Request Functions
   */
  public async fetchCurrent(): Promise<any> {
    const url = urlJoin(
      [this._url, this._current, this._path],
      this._options.addBackSlash
    )
    this.clearIdPath()

    return await parseResponsePro({
      ...this._getRequestArgs(url, 'GET'),
      parseData: undefined,
      loading$: this.currentLoading$
    }).then((data) => {
      if (data) {
        this.currentData = data
        this.currentData$.next(this.currentData)
        this.id(this._current).putLocal(this.currentData)
        return data
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
    const data = (this.data as T[]).find((d: T) => d[this._idAttribute] === id)
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
  public options(opts: RequestOptsPro<D, T> = {}): DataClientPro<D, T> {
    this._options = {
      ...this._options,
      ...opts
    }
    return this
  }

  /**
   *
   * @param q
   * @category Chain Operators
   */
  public query(q = {}): DataClientPro<D, T> {
    this._query = {
      ...q
    }
    this.query$.next(this._query)
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
   *  await DataClientPro.id('12345').path('publish/').post();
   * ```
   */
  public path(p: string): DataClientPro<D, T> {
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

  // * -------------------------------- local data methods

  /**
   * Update all Raw data locally
   * @param rawData
   * @category Local Data Modification
   */
  public updateRawDataLocal(rawData: D) {
    if (rawData) {
      this.rawData = JSON.parse(JSON.stringify(rawData))
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
  public updateLocal(data: T[]) {
    if (data?.length) {
      this.data = [...data]
      this.emit$()
    }
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
      this.data = [...(this.data as T[]), body]
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
      this.data = [body, ...(this.data as T[])]
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
    if (
      body &&
      body[this._idAttribute] &&
      id &&
      (this.data as T[]).find((v: T) => v[this._idAttribute] === id)
    ) {
      const d = (this.data as T[]).map((v) => {
        if (v[this._idAttribute] === id) {
          return { ...v, ...body }
        }
        return v
      })
      this.data = [...d]
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
    if (id && (this.data as T[]).find((v: T) => v[this._idAttribute] === id)) {
      this.data = [
        ...(this.data as T[]).filter((v: T) => v[this._idAttribute] !== id)
      ]
      this.emit$()
    }
    return this.data
  }

  protected emit$() {
    this.rawData$.next(this.rawData)
    this.data$.next(this.data as T[])
  }

  /**
   *  clear Id and path after request
   */
  protected clearIdPath(): void {
    this._id = ''
    this._path = ''
  }
}
