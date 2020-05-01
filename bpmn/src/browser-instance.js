const puppeteer = require('puppeteer')

const createBrowser = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    landscape: true,
    deviceScaleFactor: 2 })
  try {
    return browser
  } catch (err) {
    browser.close()
    throw err
  } finally {
    browser.disconnect()
  }
}

module.exports = {
  create: async () => {
    return createBrowser()
  }
}
