import GitHubRepository from './GitHub'
import AzureRepository from './Azure'
import NpmRepository from './Npm'
import BintrayRepository from './Bintray'
import IpfsRepository from './Ipfs'

import { IRepository, RepositoryConfig } from './IRepository'
import { ConstructorOf } from '../util'
import { ParsedSpec } from '../SpecParser'

type RepositoryMap = { [index: string] : ConstructorOf<IRepository> }

export default class RepositoryManager {

  // TODO replace with handleSpec mechanism: let repos tell the manager if they can answer requests
  private repositories : RepositoryMap = {
    'github': GitHubRepository,
    'azure': AzureRepository,
    'windows': AzureRepository, // handle: https://gethstore.blob.core.windows.net
    'npm': NpmRepository,
    'bintray': BintrayRepository,
    'ipfs': IpfsRepository
  }

  async addRepository(name: string, repo: ConstructorOf<IRepository>) : Promise<void> {
    this.repositories[name] = repo
  }

  async listRepositories() : Promise<Array<string>> {
    return Object.keys(this.repositories)
  }

  async removeRepository(name: string) : Promise<boolean> {
    return delete this.repositories[name]
  }

  async getRepository(config: ParsedSpec | RepositoryConfig | string) : Promise<IRepository | undefined> {

    if (typeof config === 'string') {
      if (config in this.repositories) {
        return new this.repositories[config]({})
      }
      return undefined
    }

    const { name } = config
    if (name && name in this.repositories) {
      return new this.repositories[name.toLowerCase()](config) as IRepository
    } 

    // nothing found: ask repos
    const repos = Object.values(this.repositories)
    for (const repo of repos) {
      if (repo.hasOwnProperty('handlesSpec')) {
        // @ts-ignore
        const processedConfig = repo.handlesSpec(config)
        if (processedConfig) {
          return new repo(processedConfig)
        }
      }
    }
  
    return undefined
  }
}

