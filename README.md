
<p align="center">
<img align="center" width="200px"src="https://github.com/PhilippLgh/ethereum-signed-packages/raw/master/assets/ethpkg_logo.png" alt="ethpkg logo">
</p>

<div align="center">
<h1>ethpkg - Ethereum Flavored Packages</h1>
</div>
<p align="center">
  <a href="https://circleci.com/gh/PhilippLgh/ethpkg"><img src="https://img.shields.io/circleci/project/github/PhilippLgh/ethpkg/master.svg" alt="Build Status"></a>
  <a href="https://npmcharts.com/compare/ethpkg?minimal=true"><img src="https://img.shields.io/npm/dm/ethpkg.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/ethpkg"><img src="https://img.shields.io/npm/v/ethpkg.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/ethpkg"><img src="https://img.shields.io/npm/l/ethpkg.svg" alt="License"></a>
  <br>
</p>

# Table of Contents <!-- omit in toc -->
- [Installation](#installation)
- [CLI](#cli)
  - [Example: create, sign and publish packages from CLI](#example-create-sign-and-publish-packages-from-cli)
    - [1. Create a package:](#1-create-a-package)
    - [2. Sign the package](#2-sign-the-package)
        - [**(optional)** Create key:  `ethpkg` can be used to create signing keys.](#optional-create-key-ethpkg-can-be-used-to-create-signing-keys)
          - [Command: `ethpkg key new -a <alias> -p <password> -k <keystore path>`](#command-ethpkg-key-new--a-alias--p-password--k-keystore-path)
          - [Example: `ethpkg key new -a my-project -k .` will create a new keyfile int the current directory:](#example-ethpkg-key-new--a-my-project--k--will-create-a-new-keyfile-int-the-current-directory)
        - [**(optional)** List keys to find available keys:](#optional-list-keys-to-find-available-keys)
          - [Command: `ethpkg key list`](#command-ethpkg-key-list)
        - [Sign package:](#sign-package)
          - [Command: `ethpkg sign <zip | tarball> -a <alias | address | filename> -k <path to keyfile | keystore>`](#command-ethpkg-sign-zip--tarball--a-alias--address--filename--k-path-to-keyfile--keystore)
          - [Example sign with local key: `ethpkg sign ./my-foo-0.0.1.tar.gz -k ./ethpkg--UTC--2020-04-20T10-50-25.052Z--0xF3EaDEdA87D8ed949fC50da07CF26Aa18cE3fb62 `](#example-sign-with-local-key-ethpkg-sign-my-foo-001targz--k-ethpkg--utc--2020-04-20t10-50-25052z--0xf3eadeda87d8ed949fc50da07cf26aa18ce3fb62)
          - [Example sign with alias & in-place: `ethpkg sign ./my-foo-0.0.1.tar.gz -a my-project -i true`](#example-sign-with-alias--in-place-ethpkg-sign-my-foo-001targz--a-my-project--i-true)
    - [3. Publish the package](#3-publish-the-package)
          - [Command: `ethpkg publish <package path> <hoster>`](#command-ethpkg-publish-package-path-hoster)
          - [Example publish to IPFS: `ethpkg publish foo-1.0.1_signed.tar.gz`](#example-publish-to-ipfs-ethpkg-publish-foo-101signedtargz)
          - [Example publish to GitHub: `ethpkg publish foo-1.0.1_signed.tar.gz github -r my-repository`](#example-publish-to-github-ethpkg-publish-foo-101signedtargz-github--r-my-repository)
  - [List Packages](#list-packages)
    - [Example: List packages on Ipfs](#example-list-packages-on-ipfs)
    - [Example: List GitHub releases with download counts](#example-list-github-releases-with-download-counts)
    - [Example: List packages on Microsoft Azure](#example-list-packages-on-microsoft-azure)
    - [Example: List packages on NPM](#example-list-packages-on-npm)
    - [Example: List packages on Bintray](#example-list-packages-on-bintray)
  - [Find Packages](#find-packages)
    - [Example: Latest Version](#example-latest-version)
    - [Example: Specific Version](#example-specific-version)
  - [Inspect Packages](#inspect-packages)
    - [Example: "Unsigned" package](#example-%22unsigned%22-package)
    - [Example: Signed package](#example-signed-package)
  - [Download Packages](#download-packages)
  - [Create Packages](#create-packages)
  - [Publish Packages](#publish-packages)
  - [Sign Packages](#sign-packages)
  - [Verify Packages](#verify-packages)
    - [Online](#online)
    - [Locally](#locally)
  - [Donate to a Package](#donate-to-a-package)


# Installation

# CLI

## Example: create, sign and publish packages from CLI

### 1. Create a package:
All packages should be versioned and the version should be part of the package name. 
Command: `ethpkg pack <dirname> <package name> `
Example: `ethpkg pack fooDirectory my-foo-0.0.1`  will create a package `my-foo-0.0.1.tar.gz`

### 2. Sign the package
In order to sign packages we need a key.
##### **(optional)** Create key:  `ethpkg` can be used to create signing keys.
The alias argument is strongly recommended as it helps to distinguish the purposes of keys.
The keystore path will default to the geth keystore.
###### Command: `ethpkg key new -a <alias> -p <password> -k <keystore path>`
###### Example: `ethpkg key new -a my-project -k .` will create a new keyfile int the current directory:
   ```shell
    ✔ Creating a new key with alias "my-project"
    ✔ Enter password to de/encrypt key · ****
    ✔ Repeat password to de/encrypt key · ****
    ✔ Success! New key with address 0xf5870BD1fb95934876945B360538f14CF865BBCe created at:
   ```
##### **(optional)** List keys to find available keys: 
###### Command: `ethpkg key list` 
   ```shell
  ┌─────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ alias       │ fileName                                                                                                              │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ethpkg      │ ethpkg--UTC--2020-04-20T10-15-29.475Z--0x041D023b8f9F8f837365EFB4a1d3c573F8dE21F0                                     │
  ├─────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ my-project  │ ethpkg--UTC--2020-04-20T10-27-17.263Z--0xf5870BD1fb95934876945B360538f14CF865BBCe                                     │
  └─────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
   ```
##### Sign package:
###### Command: `ethpkg sign <zip | tarball> -a <alias | address | filename> -k <path to keyfile | keystore>`  
###### Example sign with local key: `ethpkg sign ./my-foo-0.0.1.tar.gz -k ./ethpkg--UTC--2020-04-20T10-50-25.052Z--0xF3EaDEdA87D8ed949fC50da07CF26Aa18cE3fb62 `  
  ```shell
  ✔ Key found for alias "ethpkg--UTC--2020-04-20T10-50-25.052Z--0xF3EaDEdA87D8ed949fC50da07CF26Aa18cE3fb62": f3eadeda87d8ed949fc50da07cf26aa18ce3fb62
  ✔ Enter password to de/encrypt key "test" · ****
  ✔ Key unlocked: f3eadeda87d8ed949fc50da07cf26aa18ce3fb62
  ✔ Signature payload created: 5 checksums
  ✔ Package is signed: Package contents are signed by [0xf3eadeda87d8ed949fc50da07cf26aa18ce3fb62]
  ✔ Package is valid: Package contents are signed and passed integrity checks
  -> Signature by 0xf3eadeda87d8ed949fc50da07cf26aa18ce3fb62 expires: Sat Oct 17 2020 14:16:23 GMT+0200 (Central European Summer Time)
  ✔ Success! Package signed and written to /.../foo-1.0.1_signed.tar.gz
  ```
   
###### Example sign with alias & in-place: `ethpkg sign ./my-foo-0.0.1.tar.gz -a my-project -i true`  
  ```shell
  ✔ Key found for alias "my-project": f5870bd1fb95934876945b360538f14cf865bbce
  ....
  ✔ Success! Package signed and written to /.../foo-1.0.1.tar.gz
  ```

### 3. Publish the package
Ethpkg supports multiple backends for hosting with IPFS being the default.
Unfortunately, versioning and package management on IPFS is not easy and the support is not very good at the moment.
######  Command: `ethpkg publish <package path> <hoster>`
###### Example publish to IPFS: `ethpkg publish foo-1.0.1_signed.tar.gz`
```shell
Publishing package "/.../foo-1.0.1_signed.tar.gz" to hoster "ipfs"
result {
  fileName: 'foo-1.0.1_signed.tar.gz',
  original: [
    {
      Name: 'foo-1.0.1_signed.tar.gz',
      Hash: 'QmTWMAiU4WLEUs94LX6x7GSxPTT6xqfVTXtBG9rL22Gzxp',
      Size: '708'
    }
  ]
}
```
###### Example publish to GitHub: `ethpkg publish foo-1.0.1_signed.tar.gz github -r my-repository`
The GitHub access token can be provided as env variable `GITHUB_TOKEN` or as password in the interactive CLI flow:
```shell
Publishing package "/.../foo-1.0.1_signed.tar.gz" to hoster "github"
✔ Enter username · philipplgh
✔ Enter login password · **************************************** // expects access token
{
  name: 'owner_repo',
  version: '1.0.1',
  displayVersion: 'v1.0.1',
  ... other release info
}
```



## List Packages

### Example: List packages on Ipfs

### Example: List GitHub releases with download counts

### Example: List packages on Microsoft Azure
`ethpkg list azure:gethstore --attributes fileName,version,channel`

```
┌───────────────────────────────────────────────────────────┬─────────────────────────┬───────────────────┐
│ fileName                                                  │ version                 │ channel           │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-22e3bbbf.tar.gz │ 1.9.8-unstable-22e3bbbf │ unstable-22e3bbbf │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-4b8f56cf.tar.gz │ 1.9.8-unstable-4b8f56cf │ unstable-4b8f56cf │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-4ea9b62b.tar.gz │ 1.9.8-unstable-4ea9b62b │ unstable-4ea9b62b │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-765fe446.tar.gz │ 1.9.8-unstable-765fe446 │ unstable-765fe446 │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-9504c5c3.tar.gz │ 1.9.8-unstable-9504c5c3 │ unstable-9504c5c3 │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-987648b0.tar.gz │ 1.9.8-unstable-987648b0 │ unstable-987648b0 │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-adf007da.tar.gz │ 1.9.8-unstable-adf007da │ unstable-adf007da │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-afe0b654.tar.gz │ 1.9.8-unstable-afe0b654 │ unstable-afe0b654 │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-bf5c6b29.tar.gz │ 1.9.8-unstable-bf5c6b29 │ unstable-bf5c6b29 │
├───────────────────────────────────────────────────────────┼─────────────────────────┼───────────────────┤
│ geth-alltools-darwin-amd64-1.9.8-unstable-de2259d2.tar.gz │ 1.9.8-unstable-de2259d2 │ unstable-de2259d2 │
└───────────────────────────────────────────────────────────┴─────────────────────────┴───────────────────┘
```

### Example: List packages on NPM

Use ethpkg to list all of its own NPM releases:

`ethpkg list npm:philipplgh/ethpkg`

```
┌───────────────────┬─────────┬─────────────────────┐
│ fileName          │ version │ updated_at          │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.3.0.tgz  │ 0.3.0   │ 2019-04-03 14:16:53 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.2.2.tgz  │ 0.2.2   │ 2019-03-21 18:47:03 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.2.0.tgz  │ 0.2.0   │ 2019-03-19 15:44:57 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.14.tgz │ 0.1.14  │ 2019-03-03 17:44:27 │
                        ...
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.4.tgz  │ 0.1.4   │ 2019-02-12 18:03:31 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.3.tgz  │ 0.1.3   │ 2019-02-12 17:38:08 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.2.tgz  │ 0.1.2   │ 2019-02-12 17:36:27 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.1.tgz  │ 0.1.1   │ 2019-02-12 17:33:45 │
├───────────────────┼─────────┼─────────────────────┤
│ ethpkg-0.1.0.tgz  │ 0.1.0   │ 2019-02-12 17:28:32 │
└───────────────────┴─────────┴─────────────────────┘
```

### Example: List packages on Bintray

`ethpkg list bintray:hyperledger-org/besu-repo/besu`

## Find Packages

### Example: Latest Version
`ethpkg find azure:gethstore`

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│{                                                                                                                               │
│  "name": "geth-alltools-linux-mips64le-1.9.10-unstable-191364c3",                                                              │
│  "fileName": "geth-alltools-linux-mips64le-1.9.10-unstable-191364c3.tar.gz",                                                   │
│  "version": "1.9.10-unstable-191364c3",                                                                                        │
│  "displayVersion": "v1.9.10",                                                                                                  │
│  "updated_ts": 1576144519000,                                                                                                  │
│  "updated_at": "2019-12-12 09:55:19",                                                                                          │
│  "platform": "linux",                                                                                                          │
│  "arch": "32 Bit",                                                                                                             │
│  "tag": "1.9.10-unstable-191364c3",                                                                                            │
│  "size": "85917352",                                                                                                           │
│  "channel": "unstable-191364c3",                                                                                               │
│  "location": "https://gethstore.blob.core.windows.net/builds/geth-alltools-linux-mips64le-1.9.10-unstable-191364c3.tar.gz",    │
│  "checksums": {                                                                                                                │
│    "md5": "5c8c13f9702b67804c7b171bcf1db601"                                                                                   │
│  },                                                                                                                            │
│  "remote": true,                                                                                                               │
│  "signature": "https://gethstore.blob.core.windows.net/builds/geth-alltools-linux-mips64le-1.9.10-unstable-191364c3.tar.gz.asc"│
│}                                                                                                                               │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Example: Specific Version

## Inspect Packages

### Example: "Unsigned" package
`ethpkg inspect azure:gethstore@geth-alltools-linux-amd64-1.9.11-unstable-38d1b0cb.tar.gz `

### Example: Signed package

## Download Packages
## Create Packages
## Publish Packages
## Sign Packages
## Verify Packages
### Online
### Locally
## Donate to a Package
