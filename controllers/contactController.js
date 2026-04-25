const asyncHandler = require('express-async-handler')
const Contact = require('../models/Contact')
const {
  sendEmail,
  contactNotificationEmail,
  contactConfirmationEmail,
} = require('../utils/sendEmail')
const { sendSuccess, sendError } = require('../utils/responseHandler')

const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body

  const contact = await Contact.create({
    name,
    email,
    phone: phone || '',
    subject,
    message,
    ipAddress: req.ip || req.connection.remoteAddress || '',
  })

  try {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Form Submission - ${subject}`,
      html: contactNotificationEmail({ name, email, phone, subject, message }),
    })

    await sendEmail({
      to: email,
      subject: 'We received your message - RealNest',
      html: contactConfirmationEmail({ name }),
    })
  } catch (emailError) {
    console.error('Email sending failed but contact was saved:', emailError.message)
  }

  sendSuccess(
    res,
    201,
    'Your message has been sent successfully. We will get back to you within 24 hours.',
    { id: contact._id }
  )
})

const getAllContacts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const skip = (page - 1) * limit
  const status = req.query.status || ''

  const filter = {}
  if (status) filter.status = status

  const total = await Contact.countDocuments(filter)
  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  sendSuccess(res, 200, 'Contacts fetched successfully', {
    contacts,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  })
})

const updateContactStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status, adminNotes },
    { new: true, runValidators: true }
  )

  if (!contact) {
    res.status(404)
    throw new Error('Contact not found')
  }

  sendSuccess(res, 200, 'Contact status updated successfully', contact)
})

module.exports = {
  submitContact,
  getAllContacts,
  updateContactStatus,
}