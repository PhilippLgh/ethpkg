import { isUrl } from "./util"
import url from "url"

export interface ParsedSpec {
  repo: string;
  owner?: string;
  project: string;
  version?: string
}

// FIXME receive from repositories/index
const SUPPORTED_REPOS = ['azure', 'npm', 'bintray', 'ipfs', 'github']

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
        const parsedUrl = url.parse(spec)
        const { pathname, host } = parsedUrl
        // @ts-ignore
        const hostParts = host.split('.')
        // @ts-ignore
        let pathParts = pathname.split('/')
        pathParts = pathParts.filter(p => p && p !== '')
        const result = {
          repo: hostParts[0], // TODO does this cover api.host.com?
          owner: pathParts[0],
          project: pathParts[1],
          version: undefined
        }
        return result
      } catch (error) {
        throw new Error(`SpecParser error for "${spec}": ${error.message}`)
      }
    }
    const parts = spec.split(':')
    // TODO const repoNames = Object.keys(repos)
    if (parts.length > 0 && SUPPORTED_REPOS.includes(parts[0])) {
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
        version
      }
    }
    throw new Error(`SpecParser error: no parser found for "${spec}"`)
  }
}
