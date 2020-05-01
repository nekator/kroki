const path = require('path')
const puppeteer = require('puppeteer')

class Worker {
  constructor (browserInstance) {
    this.browserWSEndpoint = browserInstance.wsEndpoint()
    this.pageUrl = process.env.KROKI_BPMN_PAGE_URL || `file://${path.join(__dirname, '..', 'assets', 'index.html')}`
  }

  async convert (task) {
    const browser = await puppeteer.connect({
      browserWSEndpoint: this.browserWSEndpoint,
      ignoreHTTPSErrors: true
    })
    const page = await browser.newPage()
    try {
      page.setViewport({ height: 800, width: 600 })
      await page.goto(this.pageUrl)
      const svg= await page.$eval('#container', (container, bpmnXML, options) => {
        /* global BpmnJS */
        const viewer = new BpmnJS({ container: container })

        function loadDiagram () {
          return new Promise((resolve, reject) => {
            viewer.importXML(bpmnXML, function (err) {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
        }

        function exportSVG () {
          return new Promise((resolve, reject) => {
            viewer.saveSVG((err, svg) => {
              if (err) {
                console.log('Failed to export', err)
                reject(err)
              } else {
                resolve(svg)
              }
            })
          })
        }

        return loadDiagram().then(() => {
          if (options.type === 'svg+xml') {
            return exportSVG();
          } else {
            const canvas = viewer.get('canvas');
            canvas.zoom('fit-viewport', 'auto');
          }
        }).catch((err) => {
          throw err
        })
      }, task.source, task.bpmnConfig)
      switch (task.bpmnConfig.type) {
        case 'svg+xml':
          return svg;
        case 'png':
        case 'jpeg':
          return await page.screenshot({omitBackground: true, type: task.bpmnConfig.type})
        case 'pdf':
          return await page.pdf({landscape: true, format: 'a4', pageRange: 1, preferCSSPageSize: true})
      }
    } catch (e) {
      console.error('Unable to convert the diagram', e)
      throw e
    } finally {
      try {
        await page.close()
      } catch (e) {
        console.warn('Unable to close the page', e)
      }
      try {
        await browser.disconnect()
      } catch (e) {
        console.warn('Unable to disconnect from the browser', e)
      }
    }
  }
}

module.exports = Worker
