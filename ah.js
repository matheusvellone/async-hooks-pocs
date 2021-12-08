const fs = require('fs')
const asyncHooks = require('async_hooks')

module.exports = (types) => {
  // will contain metadata for all tracked events
  this._tracked = {}

  this.enable = () => {
    const asyncHook = asyncHooks.createHook({
      init: (asyncId, type, triggerAsyncId, resource) => {
        if (!types || types.includes(type)) {
          if (type === 'HTTPINCOMINGMESSAGE') {
            this._tracked[asyncId] = {
              asyncId,
              type,
              pAsyncId: triggerAsyncId,
            }
            return
          }
          if (this._tracked[triggerAsyncId]) {
            this._tracked[asyncId] = this._tracked[triggerAsyncId]
            printMeta('init', asyncId, this._tracked[triggerAsyncId])
          }
        }
      },
      before: (asyncId) => {
        const meta = this._tracked[asyncId]
        if (meta) {
          if (!this._tracked[meta.pAsyncId]) {
            const [s, n] = process.hrtime()
            const nanoseconds = s * 1000000 + n / 1000
            meta.start = nanoseconds
          }
          printMeta('before', asyncId, meta)
        }
      },
      after: (asyncId) => {
        const meta = this._tracked[asyncId]
        if (meta) {
          if (!this._tracked[meta.pAsyncId]) {
            const [s, n] = process.hrtime()
            const nanoseconds = s * 1000000 + n / 1000
            meta.end = nanoseconds
            meta.duration = meta.end - meta.start
          }
          printMeta('after', asyncId, meta)
        }
      },
      destroy: (asyncId) => {
        const meta = this._tracked[asyncId]
        if (meta) printMeta('destroy', asyncId, meta)
        // delete meta for the event
        delete this._tracked[asyncId]
      },
      promiseResolve: (asyncId) => {
        const meta = this._tracked[asyncId]
        if (meta) printMeta('promiseResolve', asyncId, meta)
      }
    })
  
    asyncHook.enable()
  }

  function printMeta (eventName, asyncId, meta) {
    fs.writeSync(1, `[${eventName}] asyncId=${asyncId}, ` +
      `type=${meta.type}, pAsyncId=${meta.pAsyncId}, ` +
      `res type=${meta.res?.constructor?.name} ` + 
      `duration=${meta.duration}ns \n`)
  }

  this.createRequestContext = (data) => {
    const id = asyncHooks.executionAsyncId()
    console.log('saving to id', id)
    if (!this._tracked[id]) {
      this._tracked[id] = { data }
    } else {
      Object.assign(this._tracked[id], { data })
    }
  }
  
  this.getRequestContext = () => {
    const id = asyncHooks.executionAsyncId()
    console.log('reading from id', id)
    return this._tracked[id]
  }

  return this
}