import http from 'http'
import https from 'https'
import url from 'url'
import zlib from 'zlib'
import stream from 'stream'
import FormData from 'form-data'

class WritableMemoryStream extends stream.Writable {
  
  buffer: Buffer | undefined;
  data : any[] = []

  constructor(){
    super()
    this.buffer = undefined
    this.data = []
    this.once('finish', () => {
      // it seems that if data ony contains one item concat takes significantly longer
      // which uncovered a race condition of stream events
      this.buffer = this.data.length === 1 ? this.data.pop() : Buffer.concat(this.data)
    })
  }
  // for 30 MB file this takes .3 sec
  _write (chunk : any, enc : string, cb : Function) {
    this.data.push(chunk)
    cb()
  }
  /*
  for 30 MB file this can take 30 sec
  _write (chunk : any, enc : string, cb : Function) {
    var buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, enc);
    if(this.buffer === undefined) {
      this.buffer = buffer
    } else {
      // this.buffer = Buffer.concat([this.buffer, buffer]);
    }
    cb()
  }
  */
}

export function request(method : string, _url : string, opts : any = {}) : Promise<http.IncomingMessage> {
  const parsedURL = url.parse(_url);
  const {protocol, hostname, port, path} = parsedURL

  let protocolHandler = protocol === 'https:' ? https : http;

  let stream : any = undefined
  if (opts['Content-Type'] && opts['Content-Type'] === 'multipart/form-data') {
    let form = new FormData()
    // FIXME filename in multipart form
    // https://github.com/form-data/form-data#alternative-submission-methods
    form.append('data', opts.Body, { filename: 'foo.tar'})
    opts = {
      headers: form.getHeaders()
    }
    stream = form
  } else if(opts.headers && opts.headers['Content-Type'] && opts.headers['Content-Type'] === 'application/json') {
    if (typeof opts.Body !== 'string') {
      opts.Body = JSON.stringify(opts.Body)
    }
  }

  const { Body } = opts
  delete opts.Body

  const options = {
    method,
    protocol,
    hostname,
    port, 
    path,
    ...opts
  }

  return new Promise((resolve, reject) => {
    let req = protocolHandler.request(options, res => {
      resolve(res);
    });
    if (Body) {
      req.write(Body)
    }
    else if (stream) {
      stream.pipe(req)
    }
    req.on('error', e => {
      reject(e);
    });
    req.end();
  });
}

export async function fetch(method : string, _url : string, opts : any = {}) : Promise<Buffer> {
  const dataStream = await request(method, _url, opts)
  let buf = await downloadStreamToBuffer(dataStream)
  // TODO move logic to reqeust
  if (dataStream.headers['content-encoding'] == 'gzip') { 
    buf = zlib.gunzipSync(buf)
  }
  return buf
}

export async function downloadStreamToBuffer(response : http.IncomingMessage, progress = (p : number) => {}) : Promise<Buffer>{
  return new Promise((resolve, reject) => {
    let headers = response.headers;
    const total = parseInt(headers['content-length'] || '0', 0);
    let completed = 0;
    let writable = new WritableMemoryStream()
    response.pipe(writable)
    response.on('data', (data : any) => {
      completed += data.length;
      progress(completed / total);
    });
    //response.on('progress', progress);
    response.on('error', reject);
    // race-condition: response.on('end', () => resolve(writable.buffer))
    writable.on('finish', () => resolve(writable.buffer))
  });
}

const downloadPartial = async (_url : string, start : any , end : any) => {
  const headers = {
    'RANGE' : `bytes=${start}-${end}`
  }
  const response = await request('GET', _url, { headers })
  // console.log('response headers partial', response.headers)
  const buf = await downloadStreamToBuffer(response, undefined)
  return buf
}

export async function download(_url : string, onProgress = (progress : number) => {}, redirectCount = 0, options = { parallel: 0 }): Promise<Buffer> {
  if(redirectCount > 5) {
    throw new Error('too many redirects: ' + redirectCount)
  }
  // test for and follow redirect (GitHub)
  const result = await request('HEAD', _url);
  let headers = result.headers;
  // console.log('headers of HEAD', _url, result.statusCode, headers)
  /**
  server: 'nginx',
  date: 'Fri, 30 Aug 2019 07:45:23 GMT',
  'content-type': 'application/gzip',
  'content-length': '35104796',
  connection: 'close',
  'last-modified': 'Wed, 03 Jul 2019 23:41:55 GMT',
  'accept-ranges': 'none',
  etag:'484a288bee3fb161004054b1ef15072f1c7e4c0606e8cbe42705cb8be5fdcf0c',
  'x-checksum-sha1': '4405fe28b7740956fb98f3a7e9d28f6e9451d083',
  'x-checksum-sha2': '484a288bee3fb161004054b1ef15072f1c7e4c0606e8cbe42705cb8be5fdcf0c'
  */
  // TODO use headers to validate checksum or cache based on etag
  if (headers && headers['x-checksum-sha1']) {
    // can be csv
  }
  if ((result.statusCode === 302 || result.statusCode === 301) && headers.location) {
    _url = headers.location
    return download(_url, onProgress, redirectCount++, options)
  }
  // EXPERIMENTAL use parallel connections if range requests are supported
  // TODO if content length large
  if (options && options.parallel) {
    if (headers['accept-ranges'] === 'bytes' && !headers.location) {
      const contentLength = parseInt(headers['content-length'] || '0') || 0
      const PARALLEL_JOBS = options.parallel // 3
      const chunkSize = Math.floor(contentLength / PARALLEL_JOBS)
      console.log('try to split download in', PARALLEL_JOBS, 'chunks of', chunkSize, 'bytes each')
      const promises = Array.from({ length: PARALLEL_JOBS })
          .map((_, i) => {
            const start = chunkSize * i
            const end = i === PARALLEL_JOBS - 1 ? contentLength : start + (chunkSize -1)
            return downloadPartial(_url, start, end)
          })
      const res = await Promise.all(promises)
      const data = Buffer.concat(res)
      // const dataSha1 = sha1(data)
      return data
    } 
  }
  const response = await request('GET', _url)
  headers = response.headers
  // console.log('headers of GET', _url, result.statusCode, headers)
  if (headers.location) {
    _url = headers.location
    return download(_url, onProgress, redirectCount++, options)
  }
  if (response.statusCode !== 200) {
    throw new Error('Http(s) error: response returned status code '+response.statusCode)
  }
  // console.log('download', _url, redirectCount)
  const buf = await downloadStreamToBuffer(response, onProgress)
  return buf
}

export async function downloadJson(_url : string) : Promise<any> {
  let response = await download(_url)
  response = JSON.parse(response.toString())
  return response
}

function downloadToFile(filePath : string){
  // const dest = fso.createWriteStream(filePath);
  // downloadRaw(url, dest) 
}

