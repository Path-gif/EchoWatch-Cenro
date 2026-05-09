const backend = require('../backend/api/index.js')

module.exports = (req, res) => {
  req.url = req.url.replace(/^\/api(?=\/|$)/, '') || '/'
  return backend.handler(req, res)
}
