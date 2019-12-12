import GitHubRepository from "./GitHub"
import AzureRepository from "./Azure"
import NpmRepository from "./Npm"
import BintrayRepository from "./Bintray"
import IpfsRepository from "./Ipfs"

import { IRepository } from "./IRepository"

type RepositoryMap = { [index: string] : Function /* constructor of IRepository */ }

const repos : RepositoryMap = {
  'github': GitHubRepository,
  'azure': AzureRepository,
  'npm': NpmRepository,
  'bintray': BintrayRepository,
  'ipfs': IpfsRepository
}

const getRepository = (str: string, options: any) : IRepository | undefined => {
  if (str in repos) {
    // FIXME find better solution for typed constructors
    // @ts-ignore
    return new repos[str.toLowerCase()](options) as IRepository
  }
  return undefined
}

export default getRepository
