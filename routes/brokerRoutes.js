const express = require('express')
const router = express.Router()
const { getFeaturedBrokers } = require('../controllers/brokerController')

router.get('/featured', getFeaturedBrokers)

module.exports = router