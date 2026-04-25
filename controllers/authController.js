const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const generateToken = require('../utils/generateToken')
const { sendSuccess } = require('../utils/responseHandler')
const {
  sendEmail,
  welcomeEmail,
  brokerApplicationEmail,
  adminBrokerNotificationEmail,
  otpEmail,
  passwordChangedEmail,
} = require('../utils/sendEmail')

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body

  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
  })
  if (existingUser) {
    res.status(400)
    throw new Error('An account with this email already exists')
  }

  const hashedPassword = await hashPassword(password)

  await User.create({
    name,
    email: email.toLowerCase().trim(),
    phone,
    password: hashedPassword,
    role: 'user',
    isActive: true,
    brokerStatus: 'approved',
  })

  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to RealNest!',
      html: welcomeEmail({ name }),
    })
  } catch (emailError) {
    console.error('Welcome email failed:', emailError.message)
  }

  sendSuccess(res, 201, 'Registration successful! Please login to continue.')
})

const registerBroker = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    city,
    bio,
    experience,
    specialization,
  } = req.body

  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
  })
  if (existingUser) {
    res.status(400)
    throw new Error('An account with this email already exists')
  }

  const hashedPassword = await hashPassword(password)

  let avatarUrl = ''
  if (req.file) {
    try {
      const cloudinary = require('../config/cloudinary')
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'realnest/brokers',
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
      })
      avatarUrl = result.secure_url
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError.message)
    }
  }

  await User.create({
    name,
    email: email.toLowerCase().trim(),
    phone,
    password: hashedPassword,
    city,
    bio,
    experience,
    specialization: specialization || '',
    avatar: avatarUrl,
    role: 'broker',
    brokerStatus: 'pending',
    isActive: false,
  })

  try {
    await sendEmail({
      to: email,
      subject: 'Your Broker Application - RealNest',
      html: brokerApplicationEmail({ name }),
    })

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New Broker Application - RealNest',
      html: adminBrokerNotificationEmail({
        name,
        email,
        phone,
        city,
        experience,
      }),
    })
  } catch (emailError) {
    console.error('Broker registration email failed:', emailError.message)
  }

  sendSuccess(
    res,
    201,
    'Your broker application has been submitted successfully. You will be notified once approved.'
  )
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+password')

  if (!user) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  if (user.googleId && !user.password) {
    res.status(401)
    throw new Error(
      'This account uses Google login. Please sign in with Google.'
    )
  }

  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  if (user.role === 'broker' && user.brokerStatus === 'pending') {
    res.status(403)
    throw new Error(
      'Your broker account is pending admin approval. You will be notified via email once approved.'
    )
  }

  if (user.role === 'broker' && user.brokerStatus === 'rejected') {
    res.status(403)
    throw new Error(
      'Your broker application was rejected. Please contact support.'
    )
  }

  if (!user.isActive) {
    res.status(403)
    throw new Error(
      'Your account has been deactivated. Please contact support.'
    )
  }

  const token = generateToken(user._id)

  sendSuccess(res, 200, 'Login successful', {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      city: user.city,
      isVerified: user.isVerified,
      brokerStatus: user.brokerStatus,
    },
  })
})

const logoutUser = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Logged out successfully')
})

const googleCallback = asyncHandler(async (req, res) => {
  try {
    const user = req.user

    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=Google authentication failed`
      )
    }

    const token = generateToken(user._id)

    res.redirect(
      `${process.env.CLIENT_URL}/auth/google/success?token=${token}&userId=${user._id}`
    )
  } catch (error) {
    res.redirect(
      `${process.env.CLIENT_URL}/login?error=${encodeURIComponent(
        error.message
      )}`
    )
  }
})

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  sendSuccess(res, 200, 'User fetched successfully', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    city: user.city,
    bio: user.bio,
    isVerified: user.isVerified,
    brokerStatus: user.brokerStatus,
    totalListings: user.totalListings,
    rating: user.rating,
    createdAt: user.createdAt,
  })
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email: email.toLowerCase().trim() })

  if (!user) {
    res.status(404)
    throw new Error('No account found with this email address')
  }

  if (user.googleId && !user.password) {
    res.status(400)
    throw new Error(
      'This account uses Google login and does not have a password.'
    )
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedOtp = await hashPassword(otp)

  await User.findByIdAndUpdate(user._id, {
    otp: hashedOtp,
    otpExpire: new Date(Date.now() + 10 * 60 * 1000),
  })

  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset OTP - RealNest',
      html: otpEmail({ name: user.name, otp }),
    })
  } catch (emailError) {
    await User.findByIdAndUpdate(user._id, {
      otp: null,
      otpExpire: null,
    })
    res.status(500)
    throw new Error('Failed to send OTP email. Please try again.')
  }

  sendSuccess(
    res,
    200,
    'OTP sent to your email address. Valid for 10 minutes.'
  )
})

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+otp +otpExpire')

  if (!user) {
    res.status(404)
    throw new Error('No account found with this email address')
  }

  if (!user.otp || !user.otpExpire) {
    res.status(400)
    throw new Error('No OTP found. Please request a new OTP.')
  }

  if (user.otpExpire < new Date()) {
    await User.findByIdAndUpdate(user._id, {
      otp: null,
      otpExpire: null,
    })
    res.status(400)
    throw new Error('OTP has expired. Please request a new one.')
  }

  const isOtpValid = await bcrypt.compare(otp, user.otp)

  if (!isOtpValid) {
    res.status(400)
    throw new Error('Invalid OTP. Please check and try again.')
  }

  sendSuccess(
    res,
    200,
    'OTP verified successfully. You can now reset your password.'
  )
})

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+otp +otpExpire')

  if (!user) {
    res.status(404)
    throw new Error('No account found with this email address')
  }

  if (!user.otp || !user.otpExpire) {
    res.status(400)
    throw new Error(
      'OTP verification required. Please verify your OTP first.'
    )
  }

  if (user.otpExpire < new Date()) {
    await User.findByIdAndUpdate(user._id, {
      otp: null,
      otpExpire: null,
    })
    res.status(400)
    throw new Error(
      'Session expired. Please start the password reset process again.'
    )
  }

  const hashedNewPassword = await hashPassword(newPassword)

  await User.findByIdAndUpdate(user._id, {
    password: hashedNewPassword,
    otp: null,
    otpExpire: null,
  })

  try {
    await sendEmail({
      to: email,
      subject: 'Password Changed Successfully - RealNest',
      html: passwordChangedEmail({ name: user.name }),
    })
  } catch (emailError) {
    console.error('Password changed email failed:', emailError.message)
  }

  sendSuccess(
    res,
    200,
    'Password reset successfully. Please login with your new password.'
  )
})

module.exports = {
  registerUser,
  registerBroker,
  loginUser,
  logoutUser,
  googleCallback,
  getCurrentUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
}