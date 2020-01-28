import GitHubRepository from './GitHub'
import AzureRepository from './Azure'
import NpmRepository from './Npm'
import BintrayRepository from './Bintray'
import IpfsRepository from './Ipfs'

import { IRepository } from './IRepository'
import { ConstructorOf } from '../util'

type RepositoryMap = { [index: string] : ConstructorOf<IRepository> }

export default class RepositoryManager {

  private repositories : RepositoryMap = {
    'github': GitHubRepository,
    'azure': AzureRepository,
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

  // FIXME type otions
  async getRepository(name: string, options: any) : Promise<IRepository | undefined> {
    if (name in this.repositories) {
      return new this.repositories[name.toLowerCase()](options) as IRepository
    }
    return undefined
  }
}

