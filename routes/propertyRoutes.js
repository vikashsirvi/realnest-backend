const express = require('express')
const router = express.Router()
const {
  getFeaturedProperties,
  getCities,
  getCategories,
  searchProperties,
} = require('../controllers/propertyController')

router.get('/featured', getFeaturedProperties)
router.get('/cities', getCities)
router.get('/categories', getCategories)
router.get('/search', searchProperties)

module.exports = router