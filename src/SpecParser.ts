import { isUrl } from './util'
import url from 'url'
import { hasPackageExtension } from './utils/FilenameUtils'
import { RepositoryConfig } from './Repositories/IRepository'

export interface ParsedSpec extends RepositoryConfig {
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
    owner = pathParts[0]
    project = pathParts[1]
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
    const getRepo = (spec : string) => {
      const parts = spec.split(':')
      return parts.length > 1 ? parts[0] : undefined
    }

    const repo = getRepo(spec)
    if (!repo) {
      throw new Error('Malformed query')
    }
    spec = spec.slice(repo.length + 1)

    const getVersion = (project: string) => {
      const project_parts = project.split('@')
      let version = project_parts.length > 1 ? project_parts[1] : undefined
      if (project_parts.length > 1) {
        project = project.substring(0, project.indexOf('@'))
      }
      if (version === 'latest') {
        version = undefined
      }
      return {
        version,
        project
      }
    }

    const parts = spec.split('/')
    if (parts.length > 1) {
      const owner = parts.shift()
      const project = parts.join('/')
      const { version, project: projectParsed } = getVersion(project)
      return {
        input: spec,
        name: repo,
        owner,
        project: projectParsed,
        version
      }
    } else if(parts.length === 1) {
      const project = parts[0]
      const { version, project: projectParsed } = getVersion(project)
      return {
        input: spec,
        name: repo,
        owner: undefined,
        project: projectParsed,
        version: version
      }
    }
    throw new Error(`SpecParser error: no parser found for "${spec}"`)
  }
}
