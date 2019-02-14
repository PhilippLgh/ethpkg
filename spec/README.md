# Ethereum Signed Packages & Applications - Specification

Ethereum Signed Packages are collections of software source code, binaries or asset files that are bundled together in a container file format (zip, tar) and which are digitally signed using Ethereum's cryptography schemes and JSON data structures to describe their metadata.

Ethereum Signed Applications are Ethereum Signed Packages that are packaged in a way that makes it possible for them to be loaded by a runtime environment or virtual machine as a whole and provide additional application security.

## Motivation

Authentication is crucial in digital communications. Users must know if they are communicating e.g. with their bank's website, a representative or if there is a criminal imposter on the other end.

The same is true for software programs and code files. Whenever we execute external source code on our own or a user's machine we need to make sure that the code is trustworthy. Code that is downloaded from GitHub, NPM or other online sources and which is executed e.g. with Node.js has full access to the operating system and all its resources. 

While we use authentication in most critical communications we run arbitrary software and share access to personal resources such as bank and tax statements, personal pictures or videos, keyboard strokes, passwords, and private keys with code where we don't have any information about the author or their reputation.  

The modular and dynamic nature of JavaScript and the fast moving open source ecosystem have made it hard to track authorship and establish trust models.

While code-signing technologies like Authenticode exist they don't protect against software that downloads and executes packages on virtual machines during runtime. In this case we need code-signing on a package level.

## Signatures

Signatures are created in accordance to the JSON Web Signatures (JWS) specification as defined in [RFC7515](https://tools.ietf.org/html/rfc7515):

"A JWS represents content secured with digital signatures or Message Authentication Codes (MACs) using JSON-based data structures.

Cryptographic algorithms and identifiers for use with this specification are described in the separate JSON Web Algorithms (JWA) specification and an IANA registry defined by that specification."

Unfortunately, support for elliptic curve based signatures on the secp256k1 curve, which is used in Bitcoin and Ethereum, is not registered in the [JWA registry](https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms) which means all herein described concepts and schemes are *NOT STANDARD CONFORM*. However, [a draft](https://tools.ietf.org/id/draft-jones-webauthn-secp256k1-00.html) was submitted by Microsoft for review and we try to base the code signing on open standards.

