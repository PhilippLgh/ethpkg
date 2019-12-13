
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
    - [Example: &quot;Unsigned&quot; package](#example-quotunsignedquot-package)
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
`ethpkg inspect azure:gethstore/geth-alltools-darwin-amd64-1.9.8-unstable-22e3bbbf.tar.gz`

### Example: Signed package

## Download Packages
## Create Packages
## Publish Packages
## Sign Packages
## Verify Packages
### Online
### Locally
## Donate to a Package
