const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    broker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    type: {
      type: String,
      enum: ['full', 'emi', 'deposit'],
      default: 'full',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    stripePaymentId: {
      type: String,
      default: '',
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    emiPlan: {
      type: Number,
      default: null,
    },
    emiMonth: {
      type: Number,
      default: null,
    },
    totalEmiAmount: {
      type: Number,
      default: null,
    },
    interestRate: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

paymentSchema.index({ user: 1 })
paymentSchema.index({ broker: 1 })
paymentSchema.index({ property: 1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Payment', paymentSchema)