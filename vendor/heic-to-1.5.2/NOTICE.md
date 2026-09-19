# HEIC decoder

Unmodified heic-to 1.5.2, from https://github.com/hoppergee/heic-to and the npm heic-to@1.5.2 package. LGPL-3.0; see LICENSE. The CSP-compatible browser distribution is loaded on demand, only for HEIC/HEIF imports.

Included source and build instructions: src/, esbuild.mjs, package.json. Upstream decoder is libheif 1.22.2 with libde265; generated decoder sources retain their license notices. See https://github.com/strukturag/libheif/tree/v1.22.2 and upstream heic-to README for native decoder build instructions. The library is separately replaceable; APEX does not modify it.

SHA-256 of dist/csp/heic-to.js: c189220a7a1e87559758a48ab4700e55629fb23a4cb57489e1e8970be1b9d018. Files were extracted directly from the pinned npm package, not loaded from a runtime CDN. No photo is sent to this library's publisher.
