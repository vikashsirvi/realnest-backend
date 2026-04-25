const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      select: false,
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'broker', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    whatsapp: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    experience: {
      type: String,
      default: '',
    },
    specialization: {
      type: String,
      default: '',
    },
    languages: {
      type: String,
      default: '',
    },
    areas: {
      type: String,
      default: '',
    },
    reraNumber: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
    instagram: {
      type: String,
      default: '',
    },
    facebook: {
      type: String,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    savedProperties: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property',
        },
      ],
      default: [],
    },
    recentlyViewed: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Property',
        },
      ],
      default: [],
    },
    notifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        emailTourConfirmed: true,
        emailTourCancelled: true,
        emailPaymentDue: true,
        emailNewMessage: true,
        emailNewProperties: false,
      },
    },
    googleId: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    brokerStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    totalListings: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    otp: {
      type: String,
      select: false,
      default: null,
    },
    otpExpire: {
      type: Date,
      select: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

userSchema.index({ role: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ brokerStatus: 1 })
userSchema.index({ city: 1 })

module.exports = mongoose.model('User', userSchema)