import { isUrl } from "./util"
import url from "url"
import npa from 'npm-package-arg'

export default class Parser {
  /**
   * TODO add more unit testing for parser
   * example: npm:@philipplgh/ethpkg@^1.2.3
   * => <repo>:<owner>/<project>@<version>
   * @param spec 
   */
  static parseSpec(spec: string) {
    if (!spec) return undefined
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
          type: 'custom',
          repo: hostParts[0], // TODO does this cover api.host.com?
          owner: pathParts[0],
          project: pathParts[1],
          version: undefined
        }
        return result
      } catch (error) {
        return undefined
      }
    }
    const parts = spec.split(':')
    // TODO const repoNames = Object.keys(repos)
    const repoNames = ['azure', 'npm', 'bintray']
    if (parts.length > 0 && repoNames.includes(parts[0])) {
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
        type: 'custom',
        repo,
        owner,
        project,
        version
      }
    }

    let parsed = undefined
    try {
      parsed = npa(spec)
      // console.log('parsed ->', parsed)
    } catch (ex) {
      console.error('NPA parser error', ex.message)
    }
    return parsed
  }
}
