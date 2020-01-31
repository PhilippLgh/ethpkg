import { isUrl } from './util'
import url from 'url'

export interface ParsedSpec {
  repo?: string;
  owner?: string;
  project?: string;
  version?: string;
  input: string;
}

const parseUrl = (urlStr: string) : ParsedSpec => {
  const parsedUrl = url.parse(urlStr)
  const { pathname, host } = parsedUrl
  // @ts-ignore
  const hostParts = host.split('.')
  hostParts.pop() // remove top-level domain

  let project = undefined
  let owner = undefined
  if (pathname && pathname != '/') {
    let pathParts = pathname.split('/')
    pathParts = pathParts.filter(p => p && p !== '')
    project = pathParts[0]
    owner = pathParts[1]
  } else {
    project = hostParts[0]
  }
  const result = {
    repo: hostParts.pop(), // get part before top-level: api.github.com => github
    owner,
    project,
    version: undefined,
    input: urlStr
  }
  return result
}

export default class Parser {
  /**
   * TODO add more unit testing for parser
   * example: npm:@philipplgh/ethpkg@^1.2.3
   * => <repo>:<owner>/<project>@<version>
   * @param spec 
   */
  static async parseSpec(spec: string) : Promise<ParsedSpec> {
    if (!spec) throw new Error('spec cannot be parsed - spec is undefined')
    if (isUrl(spec)) {
      try {
        return parseUrl(spec)
      } catch (error) {
        throw new Error(`SpecParser error for "${spec}": ${error.message}`)
      }
    }
    const parts = spec.split(':')
    if (parts.length > 0) {
      const repo = parts[0]
      const package_parts = parts[1].split('/')
      const owner = package_parts.length > 1 ? package_parts.shift() : undefined
      let project = package_parts.length === 1 ? package_parts[0] : package_parts.join('/')
      // parses ethpkg@1.0.0
      const project_parts = project.split('@')
      const version = project_parts.length > 1 ? project_parts[1] : undefined
      if (project_parts.length > 1) {
        project = project.substring(0, project.indexOf('@'))
      }
      return {
        repo,
        owner,
        project,
        version,
        input: spec
      }
    }
    throw new Error(`SpecParser error: no parser found for "${spec}"`)
  }
}
