const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

let nativeBinding = null
let localFileExisted = false
let isMusl = false
let loadError = null

switch (platform) {
  case 'android':
    if (arch !== 'arm64') {
      throw new Error(`Unsupported architecture on Android ${arch}`)
    }
    localFileExisted = existsSync(join(__dirname, 'bindings.android-arm64.node'))
    try {
      if (localFileExisted) {
        nativeBinding = require('./bindings.android-arm64.node')
      } else {
        nativeBinding = require('bindings-android-arm64')
      }
    } catch (e) {
      loadError = e
    }
    break
  case 'win32':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(
          join(__dirname, 'bindings.win32-x64-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.win32-x64-msvc.node')
          } else {
            nativeBinding = require('bindings-win32-x64-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'ia32':
        localFileExisted = existsSync(
          join(__dirname, 'bindings.win32-ia32-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.win32-ia32-msvc.node')
          } else {
            nativeBinding = require('bindings-win32-ia32-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(
          join(__dirname, 'bindings.win32-arm64-msvc.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.win32-arm64-msvc.node')
          } else {
            nativeBinding = require('bindings-win32-arm64-msvc')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Windows: ${arch}`)
    }
    break
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'bindings.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.darwin-x64.node')
          } else {
            nativeBinding = require('bindings-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(
          join(__dirname, 'bindings.darwin-arm64.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.darwin-arm64.node')
          } else {
            nativeBinding = require('bindings-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
  case 'freebsd':
    if (arch !== 'x64') {
      throw new Error(`Unsupported architecture on FreeBSD: ${arch}`)
    }
    localFileExisted = existsSync(join(__dirname, 'bindings.freebsd-x64.node'))
    try {
      if (localFileExisted) {
        nativeBinding = require('./bindings.freebsd-x64.node')
      } else {
        nativeBinding = require('bindings-freebsd-x64')
      }
    } catch (e) {
      loadError = e
    }
    break
  case 'linux':
    switch (arch) {
      case 'x64':
        isMusl = readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
        if (isMusl) {
          localFileExisted = existsSync(
            join(__dirname, 'bindings.linux-x64-musl.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./bindings.linux-x64-musl.node')
            } else {
              nativeBinding = require('bindings-linux-x64-musl')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'bindings.linux-x64-gnu.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./bindings.linux-x64-gnu.node')
            } else {
              nativeBinding = require('bindings-linux-x64-gnu')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 'arm64':
        isMusl = readFileSync('/usr/bin/ldd', 'utf8').includes('musl')
        if (isMusl) {
          localFileExisted = existsSync(
            join(__dirname, 'bindings.linux-arm64-musl.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./bindings.linux-arm64-musl.node')
            } else {
              nativeBinding = require('bindings-linux-arm64-musl')
            }
          } catch (e) {
            loadError = e
          }
        } else {
          localFileExisted = existsSync(
            join(__dirname, 'bindings.linux-arm64-gnu.node')
          )
          try {
            if (localFileExisted) {
              nativeBinding = require('./bindings.linux-arm64-gnu.node')
            } else {
              nativeBinding = require('bindings-linux-arm64-gnu')
            }
          } catch (e) {
            loadError = e
          }
        }
        break
      case 'arm':
        localFileExisted = existsSync(
          join(__dirname, 'bindings.linux-arm-gnueabihf.node')
        )
        try {
          if (localFileExisted) {
            nativeBinding = require('./bindings.linux-arm-gnueabihf.node')
          } else {
            nativeBinding = require('bindings-linux-arm-gnueabihf')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on Linux: ${arch}`)
    }
    break
  default:
    throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`)
}

if (!nativeBinding) {
  if (loadError) {
    throw loadError
  }
  throw new Error(`Failed to load native binding`)
}

const { sum, JsRepeater } = nativeBinding

module.exports.sum = sum
module.exports.JsRepeater = JsRepeater
