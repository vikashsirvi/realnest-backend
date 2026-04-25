const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Broker is required'],
    },
    tourDate: {
      type: Date,
      required: [true, 'Tour date is required'],
    },
    tourTime: {
      type: String,
      default: '10:00 AM',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

bookingSchema.index({ property: 1 })
bookingSchema.index({ user: 1 })
bookingSchema.index({ broker: 1 })
bookingSchema.index({ status: 1 })
bookingSchema.index({ tourDate: 1 })
bookingSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Booking', bookingSchema)