
<p align="center">
<img align="center" width="200px"src="https://github.com/PhilippLgh/ethereum-signed-packages/raw/master/assets/ethpkg_logo.png" alt="ethpkg logo">
</p>

<div align="center">
<h1>Ethereum Signed Packages</h1>
</div>
<p align="center">
  <a href="https://circleci.com/gh/philipplgh/ethereum-signed-packages/tree/dev"><img src="https://img.shields.io/circleci/project/github/philipplgh/ethereum-signed-packages/master.svg" alt="Build Status"></a>
  <a href="https://npmcharts.com/compare/@philipplgh/ethpkg?minimal=true"><img src="https://img.shields.io/npm/dm/@philipplgh/ethpkg.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/ethpkg"><img src="https://img.shields.io/npm/v/@philipplgh/ethpkg.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@philipplgh/ethpkg"><img src="https://img.shields.io/npm/l/@philipplgh/ethpkg.svg" alt="License"></a>
  <br>
</p>

[![Ethereum Signed Package](https://img.shields.io/badge/signed--package-secp256k1-lightblue.svg?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAa9JREFUOI2Nk71rVFEQxc+Z3ddIWE1g/UDdt7u+xmAVSSEIWsVGCwUhkMZKLAyCja2Ipagg6exEBf8AEUlhmUIkaBNxZX0QLWLQzcbP5N05Fhox697V2w33Nz+YMwww4DVqjePZ3saJQUwp9pFlWYWFP4Bp/0il8uxjt/u+H2cxga8VlwHfJSkRORPj+gqae5oHRE1v1KQdadRqU/8tEP2WgeVNoOxalmWVfwqaaTpphqMA4MZVkqu/yJ1aX7/Sy/PPYrQ6OvR1y5cFk3+G2UMEVWF4J6ks2SEzjLtxrN1uP9/o2bSFrTuGjiHgk4y7CZyElAookTZJoQB1R9JIZ2Vlru8Iwb0KwzkDxv4KxlAHeN7E7dEMTFpIiIMA7vb2u+MJUR4XfDYqSIri5ZpwD47Hkh+G2VMCbyieJv1qQHFbXlqKhggAWb0+IeGRO+aMPh3MlksB12E4RehiK89vDBQAwL40vQnwAhwdB+Z/rlWzr/N8AoCiI/y2JsklQC8AJ+kE8MFCONPbHBW0Wq3vHmwKwDfJ5PKzrxYX3/Zjo9fY6XaWhoe3LdM4387z+zHuBylTqcbPOnBuAAAAAElFTkSuQmCC&labelColor=blue)]([https://img.shields.io/badge/hello-world-green.svg](https://github.com/PhilippLgh/ethereum-signed-packages))

(ethpkg was used to sign itself - 🤯)


# Why?
[![Watch the video](http://i3.ytimg.com/vi/1lH4q1-Ba0k/hqdefault.jpg)](https://www.youtube.com/embed/1lH4q1-Ba0k?start=816)

#### **TL;DW: get paid for open source & making the ecosystem more secure**

# Installation
```
yarn global add @philipplgh/ethpkg
```

# Specification

Please see [the specifcation draft](spec/README.md) for details about the signing and verification process and the respective data structures and formats.


# CLI Commands

```
keys    - generate and manage keys
pack    - create unsigned packages
sign    - sign a package
verify  - verify a package
cert    - creates certificates
version - print the version number

```


# Quickstart

## Example 1- Sign your NPM packages

```
// pack before uploading it:
npm pack
// sign the packed npm module:
```


***

# Setup Keys

Before we can start to sign packages we need to generate keys. There are multiple options to generate and manage keys:

## CLI

`TODO`

## Metamask
[Setup Metamask](https://youtu.be/ZIGUC9JAAw8?t=10) and create a dedicated code signing account.
Label it accordingly.

## Go Ethereum (Geth)

### Download Binary & Verify (GPG)

```
wget https://gethstore.blob.core.windows.net/builds/geth-darwin-amd64-1.8.22-7fa3509e.tar.gz
wget https://gethstore.blob.core.windows.net/builds/geth-darwin-amd64-1.8.22-7fa3509e.tar.gz.asc
gpg --recv-keys 9BA28146 7B9E2481 D2A67EAC
gpg --verify geth-darwin-amd64-1.8.22-7fa3509e.tar.gz.asc
tar -xzf geth-darwin-amd64-1.8.22-7fa3509e.tar.gz
cd geth-darwin-amd64-1.8.22-7fa3509e
```

### Create Code Signing Key
```
// create account
./geth account new
Your new account is locked with a password. Please give a password. Do not forget this password.
Passphrase:
Repeat passphrase:
Address: {661e161dbea99a181f9e0293c916cda89102b1a4}

cd ~/Library/Ethereum/keystore/
// currently, no way to store additional metadata so we rename the keyfile
mv UTC--...--661e161dbea99a181f9e0293c916cda89102b1a4 codesign--661e161dbea99a181f9e0293c916cda89102b1a4
// private key now in => ~/Library/Ethereum/keystore/codesign--661e161dbea99a181f9e0293c916cda89102b1a4
```

## Open SSL

```
$ openssl ecparam -name secp256k1 -genkey -out ec-codesign-pk.pem
```

The private key should be in the armored PEM format and look like:

```
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIDdW8qpFrglyMikU8s5DhjtV9lgzmktp1foU+rfC2r/EoAcGBSuBBAAK
oUQDQgAEk2N1W00oI4VQIPC5++C/L4RAI8gyVSW7l/4ywPbli2yyOGfrdUNi7ra5
bHnZaspUTQtY3aN9tLMsKUP4T7tnjg==
-----END EC PRIVATE KEY-----
```

`WARNING:`
Do never share this file / key with anyone and please note that the key is NOT encrypted.
Therefore, you should not use the key for any financial transactions and ideally store it only on an internet-disconnected device.

# Sign Packages

## Using Local Private Key

### Geth Keystore Files
[![demo](https://asciinema.org/a/33CTRh5trTuf1sxPA7pEb9Txy.svg)](https://asciinema.org/a/33CTRh5trTuf1sxPA7pEb9Txy?autoplay=1)

## Using External Signers

#### Clef

```
TODO
```

#### Metamask

```
TODO
```

#### Frame

```
TODO
```

## Web Services

```
TODO
```

# NPM Modules


# Verify Packages

## NPM Package

```
npm pack [module name here]
ethpkg verify [module file name here]
```

## Local Package
[![demo](https://asciinema.org/a/6I7vkoHONqM5KbBGa3TbC58MD.svg)](https://asciinema.org/a/6I7vkoHONqM5KbBGa3TbC58MD?autoplay=1)

## Hosted Package


# Issue Self-Signed Certificates

[![demo](https://asciinema.org/a/23SYMQbQttZjkcE1yX1lnL6Cz.svg)](https://asciinema.org/a/23SYMQbQttZjkcE1yX1lnL6Cz?autoplay=1)
