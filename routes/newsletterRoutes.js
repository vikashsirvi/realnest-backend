const express = require('express')
const router = express.Router()
const {
  subscribeNewsletter,
  unsubscribeNewsletter,
} = require('../controllers/newsletterController')
const { validateNewsletter } = require('../middleware/validateMiddleware')

router.post('/subscribe', validateNewsletter, subscribeNewsletter)
router.post('/unsubscribe', validateNewsletter, unsubscribeNewsletter)

module.exports = router