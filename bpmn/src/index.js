const Worker = require('./worker')
const Task = require('./task')
const instance = require('./browser-instance')
const micro = require('micro')
const supportedContentTypes = ['image/png','image/jpeg','application/pdf', 'image/svg+xml']


;(async () => {
  // QUESTION: should we create a pool of Chrome instances ?
  const browser = await instance.create()
  console.log(`Chrome accepting connections on endpoint ${browser.wsEndpoint()}`)
  const worker = new Worker(browser)
  const server = micro(async (req, res) => {
    // TODO: add a /_status route (return bpmn version)
    // TODO: read the diagram source as plain text
    console.log(req.headers)
    let desiredContentType = req.headers['accept']
    console.log('Accept Header: '+desiredContentType)
    const diagramSource = await micro.text(req, { limit: '10mb', encoding: 'utf8' })
    let diagramType;
    if(supportedContentTypes.includes(desiredContentType)){
     diagramType = /(image|application)\/(.*)/g.exec(desiredContentType)[2];
    }
    console.log(diagramType)
    if (diagramSource && diagramType) {
      try {
        const svg = await worker.convert(new Task(diagramSource, {type: diagramType}))
        res.setHeader('Content-Type', desiredContentType)
        return micro.send(res, 200, svg)
      } catch (e) {
        console.log('e', e)
        return micro.send(res, 400, 'Unable to convert the diagram')
      }
    }
    micro.send(res, 400, 'Body must not be empty.')
  })
  server.listen(8003)
})().catch(error => {
  console.error('Unable to start the service', error)
  process.exit(1)
})
