
<p align="center">
<img align="center" width="200px"src="https://github.com/PhilippLgh/ethereum-signed-packages/raw/master/assets/ethpkg_logo.png" alt="ethpkg logo">
</p>

<div align="center">
<h1>Ethereum Signed Packages</h1>
</div>
<p align="center">
  <a href="https://circleci.com/gh/PhilippLgh/ethereum-signed-packages"><img src="https://img.shields.io/circleci/project/github/PhilippLgh/ethereum-signed-packages/master.svg" alt="Build Status"></a>
  <a href="https://npmcharts.com/compare/ethpkg?minimal=true"><img src="https://img.shields.io/npm/dm/ethpkg.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/ethpkg"><img src="https://img.shields.io/npm/v/ethpkg.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/ethpkg"><img src="https://img.shields.io/npm/l/ethpkg.svg" alt="License"></a>
  <br>
</p>


**Sign packages or npm modules with Ethereum keys and receive crypto currency from the community:**

[![ethpkg status](http://api.ethpkg.org/badge/npm/ethpkg)](https://github.com/PhilippLgh/ethereum-signed-packages)

(ethpkg was used to sign itself 🤯)


# Why?
[![Watch the video](http://i3.ytimg.com/vi/1lH4q1-Ba0k/hqdefault.jpg)](https://www.youtube.com/watch?v=1lH4q1-Ba0k&t=813)


Most Node.js modules and many other packages today are not code signed because the processes, tools or certificates are hard to understand, opaque and expensive.
Open source developers are [burning out](https://motherboard.vice.com/en_us/article/43zak3/the-internet-was-built-on-the-free-labor-of-open-source-developers-is-that-sustainable) and are not gaining anything from walking this extra mile.

This project aims to change that: 

**Package authors / developers** sign their modules to signal others that they care about security and to build up reputation. They can stay anonymous in the process. Signed modules become self-contained and portable. The delivery, authorship and security aspects are separated allowing modules to be mirrored, licensed, hosted in P2P registries or provided in other (=faster) ways. Packages are signed using cryptocurrency compatible keys so everyone who verifies or validates packages can use the author's address to donate or pay for a license.

**Projects that depend on secure modules** can express their gratitude for the open source work & extra security by sending package authors crypto currency. This is a win-win-win situation because it incentivizes open source development, increases code quality and covers maintenance costs.

All the tools needed for this are free and available in this repository. There are no middlemen or donation platforms involved - 100% of the funds sent go to the authors. 

All donations are transparent and traceable.

Let's make the Internet a better place together! :)

# Installation
```
npm install -g ethpkg
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
$ npm install -g ethpkg

2. create project signing key in global keystore.
from project directory containing package.json run:
$ ethpkg key new

3. Add to the package.json scripts:
"publish": "npm pack && ethpkg sign --publish true"
```

**Done.** From now on, publish with:
**`npm run publish`** instead of `npm publish` to sign your releases!

Add a badge to your readme to receive donations or project funding and indicate others that you care about module security.


### Example 2- Sign your NPM packages manually
*(replace "ethpkg-0.2.0.tgz" in the example with your module name)*

```
// 1.) pack before uploading it:
$ npm pack

// 2.) sign the packed npm module:
$ ethpkg sign ethpkg-0.2.0.tgz code-signing-key.json --overwrite true

// (optionally) verify:
$ ethpkg verify ethpkg-0.2.0.tgz
>> √ package contents passed integrity checks and are signed by [0xe69c103f6fdc766459d1a1436c3a36518006867b]

// 3.) publish
$ npm publish ethpkg-0.2.0.tgz

// 4.) Profit
// add badge to receive donations
```

## Badges

If you want to display the signing status of your project on GitHub, you can use the following Markdown:

```
[![ethpkg status](http://api.ethpkg.org/badge/:service/:author/:name)](http://ethpkg.org/:service/:author/:name)
```

The badge generator can currently verify packages hosted on NPM or GitHub (releases).
To verify a package that is hosted e.g. on NPM or GitHub replace the `:service`, `:author` (optional), and `:name` part of the url with the desired package info. For GitHub releases `:author` would be the repository owner and `:name` the repository name.

**Example:** For the package `ethpkg` (this package) the corresponding url is:
`http://api.ethpkg.org/badge/npm/ethpkg` and the badge code is:
```
[![ethpkg status](http://api.ethpkg.org/badge/npm/ethpkg)](http://ethpkg.org/npm/ethpkg)
```


## Notary Service

A hosted version of `ethpkg` is available at `api.ethpkg.org` (mirror at `api.ethpkg.dev`).


***

# CLI

More instructions how to use the CLI can be found in the [CLI Docs](docs/CLI.md)

# API

More instructions how to use `ethpkg` within another project can be found in the [API Docs](docs/API.md)
