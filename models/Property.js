const mongoose = require('mongoose')

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Property description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Property type is required'],
      enum: ['apartment', 'villa', 'house', 'office', 'plot', 'commercial'],
    },
    purpose: {
      type: String,
      required: [true, 'Property purpose is required'],
      enum: ['rent', 'sale'],
    },
    price: {
      type: Number,
      required: [true, 'Property price is required'],
      min: [0, 'Price cannot be negative'],
    },
    priceUnit: {
      type: String,
      enum: ['month', 'year', 'day', 'total'],
      default: 'total',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    balconies: {
      type: Number,
      default: 0,
      min: 0,
    },
    floors: {
      type: Number,
      default: 1,
      min: 1,
    },
    size: {
      type: Number,
      default: null,
    },
    propertyAge: {
      type: Number,
      default: null,
    },
    furnishing: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
      default: 'unfurnished',
    },
    facing: {
      type: String,
      default: '',
    },
    parking: {
      type: Boolean,
      default: false,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    videoUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    enquiryCount: {
      type: Number,
      default: 0,
    },
    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Broker reference is required'],
    },
  },
  {
    timestamps: true,
  }
)

propertySchema.index({ broker: 1 })
propertySchema.index({ status: 1 })
propertySchema.index({ city: 1 })
propertySchema.index({ purpose: 1 })
propertySchema.index({ type: 1 })
propertySchema.index({ isFeatured: 1 })
propertySchema.index({ price: 1 })
propertySchema.index({ createdAt: -1 })

module.exports = mongoose.model('Property', propertySchema)