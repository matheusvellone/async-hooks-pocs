const express = require('express')
const Promise = require('bluebird')
const asyncHooks = require('./ah')()

asyncHooks.enable()

const log = (message) => {
  const requestData = asyncHooks.getRequestContext()

  console.log(JSON.stringify({
    message,
    _metadata: requestData,
  }, null, 2))
}

const asyncFunction = async () => {
  log('inside async function')
}

const app = express()
const port = 3000

app.use(async (request, response, next) => {
  const requestId = Math.random()
  asyncHooks.createRequestContext({
    requestId,
  })
  await Promise.delay(1000)

  log(requestId)

  next()
})

const requestHandler = async (request, response, next) => {
  response.send(asyncHooks.getRequestContext())
  await asyncFunction()
  log('respondendo')
  next()
}

app.get('/', requestHandler)

app.listen(port, async (err) => {
  if (err) {
    return console.error(err)
  }
  console.log(`server is listening on ${port}`)
})
