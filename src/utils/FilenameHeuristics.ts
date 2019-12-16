import semver from 'semver'

// https://github.com/sindresorhus/semver-regex
const semverMatcher = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig;

export const extractVersionFromString = (str : string | undefined) :string | undefined => {
  if (str === undefined) return undefined
  // first check segment by segment
  const segments = str.split(/(-|_)+/)
  for (const segment of segments) {
    const res = semver.clean(segment, { loose: true })
    if (res) return res
  }
  // if nothing found try regex (more aggressively)
  // FIXME regex will not include prerelease info
  semverMatcher.lastIndex = 0
  const result = semverMatcher.exec(str)
  const version = result && result.length > 0 ? result[0] : undefined
  if (!version) return undefined
  return semver.clean(version) || undefined
}

// 0.4.4-Unstable-0bc45194 -> v0.4.4
export const versionToDisplayVersion = (version : string | undefined) => {
  if (!version) return undefined
  version = semver.clean(version) || version
  const n = version.indexOf('-')
  version = version.substring(0, n != -1 ? n : version.length)
  return `v${version}`
}

export const extractChannelFromVersionString = (versionString?: string) : string | undefined => {
  if (!versionString) return undefined
  const prereleaseInfo = semver.prerelease(versionString)
  const channel = prereleaseInfo && prereleaseInfo.length > 0 ? prereleaseInfo[0] : undefined
  return channel
}

// heuristic to extract platform info from (display) name
export const extractPlatformFromString = (str : string) => {
  str = str.toLowerCase() 
  if (str.includes('win32') || str.includes('windows')) {
    return 'windows'
  }
  if (str.includes('darwin') || str.includes('mac') || str.includes('macos')) {
    return 'mac'
  }
  if (str.includes('linux')) {
    return 'linux'
  }
  return undefined
}

/*
* https://askubuntu.com/questions/54296/difference-between-the-i386-download-and-the-amd64
* amd64 and intel64 are compatible
* TODO but we might want to distinguish arm chips etc
* https://en.wikipedia.org/wiki/ARM_architecture#Cores
*/
const ARCH = {
  'ARM32': '32 Bit',
   // all arm are 32 since ARMv8-A they are 64/32
  'ARM64': '64 Bit',
  'B32': '32 Bit',
  // TODO use this notation?
  'B3264': '32/64 Bit',
  'B64': '64 Bit'
}

// heuristic to extract platform architecture (display) name
export function extractArchitectureFromString(str : string){
  try {
    // FIXME remove extension first
    str = str.toLowerCase()
    let name = str
    // FIXME this heuristic wil fail for binaries with names like winrar
    // FIXME we can probably re-use the result from extractPlatform here for perf
    let isWindows = name.includes('windows') || name.includes('win')
    const parts = str.split(/[\s_-]+/)
    for(str of parts) {
      if (isWindows) {
        if (str.includes('386')) {
          return ARCH.B32
        }
        if (str.includes('amd64')) {
          return ARCH.B64
        }
        if (str.includes('win32')) {
          return ARCH.B32
        }
      }
      if (str.includes('x86-64')) {
        return ARCH.B64
      }
      if (str.includes('x86')) {
        return ARCH.B32
      }
      if (str.includes('ia32')) {
        return ARCH.B32
      }
      if (str === 'arm64') {
        return ARCH.ARM64
      }
      if (str === 'arm') {
        return ARCH.ARM32
      }
    }
    return ARCH.B32    
  } catch (error) {
    return undefined
  }
}
