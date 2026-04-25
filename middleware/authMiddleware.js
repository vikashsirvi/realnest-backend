const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const User = require('../models/User')

const protect = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized. No token provided.')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      res.status(401)
      throw new Error('Not authorized. User not found.')
    }

    if (!user.isActive) {
      res.status(401)
      throw new Error('Your account has been deactivated. Please contact support.')
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      res.status(401)
      throw new Error('Not authorized. Invalid token.')
    }
    if (error.name === 'TokenExpiredError') {
      res.status(401)
      throw new Error('Not authorized. Token has expired. Please login again.')
    }
    throw error
  }
})

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403)
      throw new Error(
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      )
    }
    next()
  }
}

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
    } catch (error) {
      req.user = null
    }
  }

  next()
})

module.exports = { protect, authorize, optionalAuth }