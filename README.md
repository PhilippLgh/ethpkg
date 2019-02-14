# Ethereum Signed Packages

```
███████╗████████╗██╗  ██╗    ██████╗ ██╗  ██╗ ██████╗ 
██╔════╝╚══██╔══╝██║  ██║    ██╔══██╗██║ ██╔╝██╔════╝ 
█████╗     ██║   ███████║    ██████╔╝█████╔╝ ██║  ███╗
██╔══╝     ██║   ██╔══██║    ██╔═══╝ ██╔═██╗ ██║   ██║
███████╗   ██║   ██║  ██║    ██║     ██║  ██╗╚██████╔╝
╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ 
                                                      
```

# Installation

```
yarn global add @philipplgh/ethpkg
```

```
npx @philipplgh/ethpkg verify test_signed.zip 0xF863aC227B0a0BCA88Cb2Ff45d91632626CE32e7
```

# Spec

# Setup Keys

Before we can start to sign packages we need to generate keys. There are multiple options to generate and manage keys:

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

# Sign Packages

## Using Local Private Key

### Geth Keystore Files
[![demo](https://asciinema.org/a/33CTRh5trTuf1sxPA7pEb9Txy.svg)](https://asciinema.org/a/33CTRh5trTuf1sxPA7pEb9Txy?autoplay=1)

## Using External Signer

### Geth

```

```

# Verify Packages
