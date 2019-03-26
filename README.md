
<p align="center">
<img align="center" width="200px"src="https://github.com/PhilippLgh/ethereum-signed-packages/raw/master/assets/ethpkg_logo.png" alt="ethpkg logo">
</p>

<div align="center">
<h1>Ethereum Signed Packages</h1>
</div>
<p align="center">
  <a href="https://circleci.com/gh/PhilippLgh/ethereum-signed-packages"><img src="https://img.shields.io/circleci/project/github/PhilippLgh/ethereum-signed-packages/master.svg" alt="Build Status"></a>
  <a href="https://npmcharts.com/compare/@philipplgh/ethpkg?minimal=true"><img src="https://img.shields.io/npm/dm/@philipplgh/ethpkg.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/ethpkg"><img src="https://img.shields.io/npm/v/@philipplgh/ethpkg.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/ethpkg"><img src="https://img.shields.io/npm/l/@philipplgh/ethpkg.svg" alt="License"></a>
  <br>
</p>

[![Ethereum Signed Package](https://nevmuy1rhk.execute-api.us-east-1.amazonaws.com/dev/badge/npm/@philipplgh/ethpkg?x=2)](https://github.com/PhilippLgh/ethereum-signed-packages)

(ethpkg was used to sign itself - 🤯)


# Why?
[![Watch the video](http://i3.ytimg.com/vi/1lH4q1-Ba0k/hqdefault.jpg)](https://www.youtube.com/watch?v=1lH4q1-Ba0k&t=813)

#### **TL;DW: get paid for open source work while making the ecosystem more secure**

# Installation
```
yarn global add @philipplgh/ethpkg
```

# Specification

Please see [the specifcation draft](spec/README.md) for details about the signing and verification process and the respective data structures and formats.


# CLI Commands

```
key     - generate and manage keys
cert    - create certificates
pack    - create unsigned packages from dir
sign    - sign packages
verify  - verify packages
version - print version number
```


# Quickstart

### Example 1- Sign your NPM packages automatically

```
1. install ethpkg
$ yarn global add @philipplgh/ethpkg

2. create project signing key in global keystore
$ ethpkg key new "<project name here>"

3. Add to the package.json scripts:
"publish": "npm pack && ethpkg sign --publish true"
```

From now on, publish with (!):
**`npm run publish`** instead of `npm publish` to sign your releases.


### Example 2- Sign your NPM packages manually
*(replace "philipplgh-ethpkg-0.2.0.tgz" in thte example with your module name)*

```
// 1.) pack before uploading it:
$ npm pack

// 2.) sign the packed npm module:
$ ethpkg sign philipplgh-ethpkg-0.2.0.tgz code-signing-key.json --overwrite true

// (optionally) verify:
$ ethpkg verify philipplgh-ethpkg-0.2.0.tgz
>> √ package contents passed integrity checks and are signed by [0xe69c103f6fdc766459d1a1436c3a36518006867b]

// 3.) publish
$ npm publish philipplgh-ethpkg-0.2.0.tgz

// 4.) Profit
// add badge to receive donations
```


## Badges

If you want to display the signing status of your project on GitHub, you can use the following Markdown:


***

# CLI

More instructions how to use the CLI can be found in the [CLI Docs](docs/CLI.md)

# API

More instructions how to use `ethpkg` within another project can be found in the [API Docs](docs/API.md)
