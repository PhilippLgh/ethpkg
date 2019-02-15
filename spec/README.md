# Ethereum Signed Packages & Applications - Specification

Ethereum Signed Packages are collections of software source code, binaries or asset files that are bundled together in a container file format (zip, tar) and which are digitally signed using Ethereum's cryptography schemes and JSON data structures to describe their metadata.

Ethereum Signed Applications are Ethereum Signed Packages that are packaged in a way that makes it possible for them to be loaded by a runtime environment or virtual machine as a whole and provide additional application security.

# Motivation

Authentication is crucial in digital communications. Users must know if they are communicating e.g. with their bank's website, a representative or if there is a criminal imposter on the other end.

The same is true for software programs and code files. Whenever we execute external source code on our own or a user's machine we need to make sure that the code is trustworthy. Code that is downloaded from GitHub, NPM or other online sources and which is executed e.g. with Node.js has full access to the operating system and all its resources. 

While we use authentication in most critical communications we often run arbitrary software and share access to personal resources such as bank and tax statements, personal pictures or videos, keyboard strokes, passwords, and private keys with code lacking any kind of information about the author, their reputation or intentions.  

The modular and dynamic nature of JavaScript and the fast moving open source ecosystem have made it hard to track authorship and establish trust models.

While code-signing technologies like Authenticode exist, they don't protect against software that downloads and executes packages on virtual machines during runtime. In this case we need code-signing on a package level.

# Overview

Signatures are created in accordance to the JSON Web Signatures (JWS) specification as defined in [RFC7515](https://tools.ietf.org/html/rfc7515):

"A JWS represents content secured with digital signatures or Message Authentication Codes (MACs) using JSON-based data structures.

Cryptographic algorithms and identifiers for use with this specification are described in the separate JSON Web Algorithms (JWA) specification and an IANA registry defined by that specification."

Unfortunately, support for elliptic curve based signatures on the secp256k1 curve, which is used in Bitcoin and Ethereum, is not registered in the [JWA registry](https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms) which means all herein described concepts and schemes are *NOT STANDARD CONFORM*. However, [a draft](https://tools.ietf.org/id/draft-jones-webauthn-secp256k1-00.html) was submitted by Microsoft for review and we try to be compatible with open standards as much as possible.

One important consideration is to encode values NOT to be space efficient or url safe but instead make contents human-readable for easier checks and better information during signing. The signing of program-provided cryptic messages poses the risk of malware spoofing the user to be a code signer and letting them sign transactions instead.

To avoid the risk of falsely signed messages and transactions key management and metadata will play an important role with additional key usages.

# Package Format

We assume the following example directory structure and contents for a (Progressive) Web App:

<pre>
    MyApp
(a) ├── build/
(b) ├── node_modules/
(c) ├── public/
( ) │   ├── favicon.ico
( ) │   ├── index.html
( ) │   ├── manifest.json
(d) ├── src/
( ) │   ├── App.css
( ) │   ├── App.js
( ) │   ├── App.test.js
( ) │   ├── index.css
( ) │   ├── index.js
( ) │   ├── logo.svg
( ) │   ├── serviceWorker.js
(e) ├── .gitignore
(f) ├── package.json
(g) ├── package-lock.json
(h) ├── README.md
(i) ├── LICENSE.md
</pre>

## Source vs Build

# Security Considerations for JWS

## alg: 'none'
Source: https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/

Care should be taken if more than one `arg` parameter and especially the `none` arg value is supported:

To verify a JWS:
"First, we need to determine what algorithm was used to generate the signature. No problem, there's an alg field in the header that tells us just that.

But wait, we haven't validated this token yet, which means that we haven't validated the header. This puts us in an awkward position: in order to validate the token, we have to allow attackers to select which method we use to verify the signature."

## The 'jwk' Header parameter
Source: https://mailarchive.ietf.org/arch/msg/jose/gQU_C_QURVuwmy-Q2qyVwPLQlcg


# JWS Construction

## Header:

```
const header = {
  alg: 'ES256K',
  b64: false,
  crit: ['b64'],
  // TODO specify key / cert scheme
}
```

The example header for the JWS uses `ES256K` (as suggested by above linked draft) to indicate the usage of an EC secp256k1 algorithm to construct the signature. The "uncommon" header parameter `b64` indicates that we are using "Unencoded Payload Option" described in [RFC7797](https://tools.ietf.org/html/rfc7797). The `crit`header parameter is mandated by RFC7797 to be used in conjunction with b64.

The header is JSON serialized and base64url encoded:
```
const encodedHeader = base64url.encode(JSON.stringify(header))
```


## Metadata

TODO consequent naming: digests vs checksums
`__checksums.json`

```
{
  "sha512": {
    "favicon.ico": "d792613e3c31d3aea08ae9ce51a26498afed8b48c93290640c64d0a23edc85e524bc1d090b5ba3fa161b3f2f7d31f9d1da5db77b14189fc3f8ed81ff830fa70c",
    "index.html": "83d430862db07e9fcbeb2c2f2c3bdb129d6c57d2fbc1e2b76f3844f5a1a7584aaf2cd5eea711720a354c49f80ad3f3c3b78ff0aee103c90996f04f014d02c856",
    "precache-manifest.d771c8fd09c23cbd02360cc7fd18810e.js": "af9ad3381129ecb84c26a22b6b98e2a1bbae442cda13a786ebd712f3f5b398d15bc72de7b9cfa93ffd6d5bfb0c3d4bfafcd13e66ba0dbc4d289b2e65fbd66300",
    "asset-manifest.json": "2ed0f2032c312dc03213e5758fcff5ebf07c2af9b5f8a1efcace4284724fc5b5a4dfa373d9d08324b8d2be61a9263e92c7c532e5ee817d6824822fd076e13079",
    "static/css/main.88d114b4.chunk.css": "cf78db1d08a9a919aa344b57e29250c06f011baa642b4fbbe444267cbf7085a4a4d1362c610a53ac3bbdd0b024e8819e29d9f39d4ab8dd07a2cecbb56bb119f0",
    "static/css/main.88d114b4.chunk.css.map": "bf6b50e64addd17a4b2f444240e2c3fd2fb4ff04674af1d31379cfc850376b689711f314c773e6402fcbb50bfdcdeabbb448c595506539172376d6bf6ce9cf8d",
    "static/js/2.d16a2668.chunk.js.map": "744b1212b0e9fd258a4c5a40c544e59c9672fefc5f9739e905f0858ee4b47ef04a17999b7d0c3e1c5b4e1e74d3e0c9afe8c8601ca1adf07ac7ff8ec8b87f06b8",
    "static/js/main.83426d44.chunk.js": "c550319ae91b7460d996e8ccd460ed005260b046ae6a96f8ca5725487b587a05f2c560722ca4362541a8e60ef009c21e92193a7ee29966e6f6288ef7b97ac503",
    "static/js/main.83426d44.chunk.js.map": "a4d5fb17df86f2656d529aeb026c651179c5216f6181e8648c8c9ee7fba8385a415b40677e228e95fb886194ffa69f0f9f1e5f8ffa1cae32fd4f606beb477383",
    "static/js/2.d16a2668.chunk.js": "6feefc7d641f9f7230e6220257c72e55ed8dacc5b610d3009e0b8fdc2e00c762b745aba009340e5f9384720a53fe16d5c1216b7148316540b86e3cfbc6b51f69",
    "static/js/runtime~main.fdfcfda2.js": "080eca9eeac54be6a8eee791884b31cc96cf82bc33a2789e5930f9a82dd2830ff849da0450d92b2453afec78e0d1fe924c4e33346a4f3b7f74eee2c87d5388d7",
    "static/js/runtime~main.fdfcfda2.js.map": "80506f3ce3bd13387ab0b41ff22792cfe570748a7439a6ecf4c19731b759de9567b8784784e7b9beaa3affe41ca35dcccfc4966f3f90c76bd5de6a29cba231a3",
    "static/media/logo.5d5d9eef.svg": "2d2033ba5ef6737190e4d76e5684327d870b024b5fd85698cd7bf21540a5e5a695da27a3f3764c6c6473e62ac5636bd53fd7c3afe3be0f2293437208050efee4",
    "manifest.json": "bea380fcb94811e5c93661342a08b5bfee89656fc0ac869c5427a216b8b54f47a9509bec73224e6a7ad0203338a281ca1625cfa30c5e55fb2aea67278e7a4eca",
    "service-worker.js": "b652eaaed585c9c1e0c2aa4f122b8210e8f95ddbae7a136eaecbad56e79572ba9aaf0ad70a5d52665677b2e42f04f6ded0b8a16126e82195b96bc4dbbafd13df"
  }
}
```
File starting with `__META__`are excluded from the digest computation.

## Payload

TODO specify payload fields

### Public Key
https://tools.ietf.org/html/rfc5480: Elliptic Curve Cryptography Subject Public Key Information

### Encoding

Note: the payload is only serialized but NOT base64url encoded (RFC7797):
```
const encodedPayload = JSON.stringify(payload)
```

For the same reason the `Signing Input` is not defined as stated in RFC7515:
```
ASCII(BASE64URL(UTF8(JWS Protected Header)) || '.' || BASE64URL(JWS Payload))
```
But instead uses:
```
ASCII(BASE64URL(UTF8(JWS Protected Header)) || '.' || JWS Payload)
```
TODO one consideration is to drop the base64url encoding from the header as well which would differ from RFC7797.

## Serialization

The JWS specification distinguishes between two serialization formats:

1. JWS Compact Serialization
2. JWS JSON Serialization

The compact format (1) is primarily used in space- and character-constrained contexts such as in URLs.

Packages don't have these limitations and can make use of the more comprehensive and readable format. It is important to note though that the JWS JSON Serialization is neither optimized for compactness nor URL-safe.

Ethereum Signed Packages are using the `JWS JSON Serialization`.

In the JWS JSON Serialization, a JWS is represented as a JSON object containing some or all of these four members:

- "protected", with the value BASE64URL(UTF8(JWS Protected Header))
- "header", with the value JWS Unprotected Header
- "payload", with the value BASE64URL(JWS Payload)
- "signature", with the value BASE64URL(JWS Signature)

Especially, they are using the `flattened syntax` which is primarily used to describe single signatures.

## Signature

A JWS is signed with an ECDSA P-256 Keccak signature as follows:
Generate a digital signature of the UTF-8 representation of the JWS Signing Input using ECDSA P-256 Keccak with the desired private key.
The output will be the EC point (R, S), where R and S are unsigned integers.
Turn R and S into byte arrays in big endian order. Each array will be 32 bytes long.
Concatenate the two byte arrays in the order R and then S.
Base64url encode the resulting 64 byte array.

# Full Example

TODO placeholder: not the actual payload
```
{
  "protected": "eyJhbGciOiJFUzI1NksiLCJiNjQiOmZhbHNlfQ",
  "payload": {
    "version": 1,
    "iss": "self",
    "exp": 1550243650838,
    "data": {
      "sha512": {
        "favicon.ico": "d792613e3c31d3aea08ae9ce51a26498afed8b48c93290640c64d0a23edc85e524bc1d090b5ba3fa161b3f2f7d31f9d1da5db77b14189fc3f8ed81ff830fa70c",
        "index.html": "83d430862db07e9fcbeb2c2f2c3bdb129d6c57d2fbc1e2b76f3844f5a1a7584aaf2cd5eea711720a354c49f80ad3f3c3b78ff0aee103c90996f04f014d02c856",
        "precache-manifest.d771c8fd09c23cbd02360cc7fd18810e.js": "af9ad3381129ecb84c26a22b6b98e2a1bbae442cda13a786ebd712f3f5b398d15bc72de7b9cfa93ffd6d5bfb0c3d4bfafcd13e66ba0dbc4d289b2e65fbd66300",
        "asset-manifest.json": "2ed0f2032c312dc03213e5758fcff5ebf07c2af9b5f8a1efcace4284724fc5b5a4dfa373d9d08324b8d2be61a9263e92c7c532e5ee817d6824822fd076e13079",
        "static/css/main.88d114b4.chunk.css": "cf78db1d08a9a919aa344b57e29250c06f011baa642b4fbbe444267cbf7085a4a4d1362c610a53ac3bbdd0b024e8819e29d9f39d4ab8dd07a2cecbb56bb119f0",
        "static/css/main.88d114b4.chunk.css.map": "bf6b50e64addd17a4b2f444240e2c3fd2fb4ff04674af1d31379cfc850376b689711f314c773e6402fcbb50bfdcdeabbb448c595506539172376d6bf6ce9cf8d",
        "static/js/2.d16a2668.chunk.js.map": "744b1212b0e9fd258a4c5a40c544e59c9672fefc5f9739e905f0858ee4b47ef04a17999b7d0c3e1c5b4e1e74d3e0c9afe8c8601ca1adf07ac7ff8ec8b87f06b8",
        "static/js/main.83426d44.chunk.js": "c550319ae91b7460d996e8ccd460ed005260b046ae6a96f8ca5725487b587a05f2c560722ca4362541a8e60ef009c21e92193a7ee29966e6f6288ef7b97ac503",
        "static/js/main.83426d44.chunk.js.map": "a4d5fb17df86f2656d529aeb026c651179c5216f6181e8648c8c9ee7fba8385a415b40677e228e95fb886194ffa69f0f9f1e5f8ffa1cae32fd4f606beb477383",
        "static/js/2.d16a2668.chunk.js": "6feefc7d641f9f7230e6220257c72e55ed8dacc5b610d3009e0b8fdc2e00c762b745aba009340e5f9384720a53fe16d5c1216b7148316540b86e3cfbc6b51f69",
        "static/js/runtime~main.fdfcfda2.js": "080eca9eeac54be6a8eee791884b31cc96cf82bc33a2789e5930f9a82dd2830ff849da0450d92b2453afec78e0d1fe924c4e33346a4f3b7f74eee2c87d5388d7",
        "static/js/runtime~main.fdfcfda2.js.map": "80506f3ce3bd13387ab0b41ff22792cfe570748a7439a6ecf4c19731b759de9567b8784784e7b9beaa3affe41ca35dcccfc4966f3f90c76bd5de6a29cba231a3",
        "static/media/logo.5d5d9eef.svg": "2d2033ba5ef6737190e4d76e5684327d870b024b5fd85698cd7bf21540a5e5a695da27a3f3764c6c6473e62ac5636bd53fd7c3afe3be0f2293437208050efee4",
        "manifest.json": "bea380fcb94811e5c93661342a08b5bfee89656fc0ac869c5427a216b8b54f47a9509bec73224e6a7ad0203338a281ca1625cfa30c5e55fb2aea67278e7a4eca",
        "service-worker.js": "b652eaaed585c9c1e0c2aa4f122b8210e8f95ddbae7a136eaecbad56e79572ba9aaf0ad70a5d52665677b2e42f04f6ded0b8a16126e82195b96bc4dbbafd13df"
      }
    }
  },
  "signature": "NxwXsF5KYkGnl058EMPfNmwkMXX8JXqWfccdN_TMVHk2ni6OnaPhcoa0tjOnJtjI2O3an2miXtPMz_TohJGjsw"
}
```

# Ethereum Specifics

## Signed (Personal) Messages

