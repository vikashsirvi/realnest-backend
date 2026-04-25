const express = require('express')
const router = express.Router()
const {
  submitContact,
  getAllContacts,
  updateContactStatus,
} = require('../controllers/contactController')
const { validateContact } = require('../middleware/validateMiddleware')

router.post('/', validateContact, submitContact)

router.get('/', getAllContacts)

router.patch('/:id/status', updateContactStatus)

module.exports = router