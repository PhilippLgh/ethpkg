import GitHubRepository from "./GitHub"
import AzureRepository from "./Azure"
import { IRepository } from "../IRepository"

type RepositoryMap = { [index: string] : Function /* constructor of IRepository */ }

const repos : RepositoryMap = {
  'github': GitHubRepository,
  'azure': AzureRepository
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
