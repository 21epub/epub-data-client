// support request for node
import { ajax, AjaxRequest } from 'rxjs/ajax'

const xhr2 = require('xhr2')

const XHR2 = typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : xhr2

export default function request(options: AjaxRequest) {
  return ajax({ createXHR: () => new XHR2(), ...options })
}
