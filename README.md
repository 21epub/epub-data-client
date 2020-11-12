# @21epub/epub-data-client

> data api client for epub

[![NPM](https://img.shields.io/npm/v/@21epub/epub-data-client.svg)](https://www.npmjs.com/package/@21epub/epub-data-client) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) ![Build Status](https://img.shields.io/travis/com/21epub/epub-data-client) ![Codecov](https://img.shields.io/codecov/c/github/21epub/epub-data-client)

## Intro

Well, This is a data client for Epub . （ Can be reformed for other Usage )

## Feature

- [x] Easy-to-use
- [x] Typescript Only
- [x] RestFul data client support
- [x] Object Client support
- [x] Local data manupulate
- [x] Hooks for data client
- [x] Both for web and node supported

## Install

```bash
npm install --save @21epub/epub-data-client
```

## Usage

- [Documentation](https://21epub.github.io/epub-data-client/classes/dataclient.html)

```ts
import { DataClient } from '@21epub/epub-data-client'

const client = new DataClient('http://url.to/data/')

client.fetchAll()

class Example extends Component {
  data = client.useData()
  render() {
    return (
      <>
        <div> Total Data: {data?.length} </div>
      </>
    )
  }
}
```

For Details: See Example

## Developing and running on localhost

First install dependencies and then install peerDeps for parcel dev:

```sh
npm install
npm run install-peers
```

To run Example in hot module reloading mode:

```sh
npm start
```

To create a parcel example production build:

```sh
npm run build-prod
```

To create a bundle library module build:

```sh
npm run build
```

To update documentation

```sh
npm run doc
```

## Running

Open the file `dist/index.html` in your browser

## Testing

To run unit tests:

```sh
npm test
```

## License

MIT © [21epub](https://github.com/21epub)
