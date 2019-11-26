import GitHubRepository from "./GitHub"
import AzureRepository from "./Azure"
import NpmRepository from "./Npm"
import BintrayRepository from "./Bintray"

import { IRepository } from "../IRepository"

type RepositoryMap = { [index: string] : Function /* constructor of IRepository */ }

export const repos : RepositoryMap = {
  'github': GitHubRepository,
  'azure': AzureRepository,
  'npm': NpmRepository,
  'bintray': BintrayRepository
}

const getRepository = (str: string, options: any) : IRepository | undefined => {
  if (str in repos) {
    // FIXME find better solution for typed constructors
    // @ts-ignore
    return new repos[str](options) as IRepository
  }
  return undefined
}

export default getRepository
