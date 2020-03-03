import fs from 'fs'
import path from 'path'
import { IRepository, IRelease, FetchOptions, Credentials } from './IRepository'
import { datestring } from '../utils/PackageUtils'
import { IPackage } from '../PackageManager/IPackage'

import { Auth, Storage, Registry, ReleaseInfo } from '@ianu/sdk'
import { removeExtension } from '../utils/FilenameUtils'
import { ParsedSpec } from '../SpecParser'
import { resolveName } from '../ENS/ens'

export default class EthpkgRepository implements IRepository {

  name: string = 'EthpkgRepository'

  private session: any
  address: any
  private registryId: string
  private project: string
  constructor({ 
    owner = '', 
    project = '' 
  }) {
    const [spaceId, subSpace] = owner.split('-')
    this.registryId = `${spaceId}/${subSpace}`
    const [userId, projectId] = project.split('/')
    /*
    if (!userId || !projectId) {
      throw new Error(`Malformed project identifier: "${project}"`)
    }
    */
    this.project = project
    this.toRelease = this.toRelease.bind(this)
  }

  private toRelease(release: ReleaseInfo) : IRelease {
    // console.log('release', release)
    const pkgInfo = release.assets && release.assets.length > 0 ? release.assets[0] : { fileName: '<error>', location: undefined}
    let { fileName, location } = pkgInfo
    if (location) {
      // convert file location in downloadable url
      location = Storage.getDownloadLinkForKey(location)
    }
    const updated_ts = release.updated_at || Date.now()
    return {
      name: release.name,
      version: release.version,
      displayVersion: release.version,
      channel: undefined,
      fileName,
      updated_ts,
      updated_at: datestring(updated_ts),
      location,
      original: release
    }
  }

  async login(credentials: Credentials) : Promise<boolean> {
    // check existing session
    if (!credentials.privateKey) {
      throw new Error('Invalid credentials - login with private key')
    }
    const { session, address } = await Auth.signIn(credentials.privateKey)
    this.session = session
    this.address = address
    return session
  }

  async isLoggedIn() {
    return this.session && await Auth.hasValidSession(this.session)
  }
  
  async listReleases(options? : FetchOptions): Promise<IRelease[]> {
    if (!this.isLoggedIn) {
      // TODO handle public and private repos
    }
    // TODO allow public key for search
    const registry = new Registry(this.registryId)
    let parts = this.project.split('/')
    let userId = parts.shift()
    if (!userId) {
      throw new Error('Malformed project ID')
    }
    if (userId.endsWith('.eth')) {
      let nameResolved = await resolveName(userId)
      if (!nameResolved) {
        throw new Error(`ENS name ${userId} could not be resolved`)
      }
      userId = nameResolved
    }
    let project = [userId, ...parts].join('/')
    const releases = await registry.listReleases(project)
    return releases.map((release:ReleaseInfo) => this.toRelease(release))
  }

  async publish(pkg: IPackage, options: any = {}) : Promise<IRelease>{
    if (!await this.isLoggedIn()) {
      throw new Error('Illegal operation. Only authenticated users can publish')
    }
  
    const pkgJsonBuf = await pkg.getContent('package.json')
    const pkgJson = JSON.parse(pkgJsonBuf.toString())

    const requiredFields = ['name', 'version', 'description', 'author']
    for (const fieldName of requiredFields) {
      if (!pkgJson[fieldName]) {
        throw new Error(`Required field "${fieldName}" is missing from package.json`)
      }
    }

    const { name, version, description, author } = pkgJson
    const metadata : ReleaseInfo = {        
      name,
      displayName: name,
      version: version,
      icon: undefined,
      description: description,
      shortDescription: description,
      publisher: {
        name: author.name,
        displayName: author.name,
        // TODO email: author.email,
        address: this.address
      }
    }
    const registry = new Registry(this.registryId, this.session)
    const buf = await pkg.toBuffer()
    const result = await registry.createRelease(metadata, [ { fileName: pkg.fileName, buffer: buf } ])
    return this.toRelease(result)
  }

  static handlesSpec(spec: ParsedSpec) : ParsedSpec | undefined {
    return spec.name && spec.name.toLowerCase() === 'ethpkg' ? spec : undefined
  }

}