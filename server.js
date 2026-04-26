const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const dotenv = require('dotenv')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')

dotenv.config()

const connectDB = require('./config/db')
const configurePassport = require('./config/passport')
const errorMiddleware = require('./middleware/errorMiddleware')

connectDB()

const seedAdmin = async () => {
  try {
    const User = require('./models/User')

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn(
        'ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seeder.'
      )
      return
    }

    const adminExists = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    })

    if (adminExists) {
      console.log('Admin account already exists')
      return
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      salt
    )

    await User.collection.insertOne({
      name: 'RealNest Admin',
      email: process.env.ADMIN_EMAIL.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      phone: '+91 98765 43210',
      avatar: '',
      city: '',
      bio: '',
      experience: '',
      specialization: '',
      googleId: null,
      isVerified: true,
      isActive: true,
      brokerStatus: 'approved',
      rejectionReason: '',
      totalListings: 0,
      rating: 0,
      totalReviews: 0,
      otp: null,
      otpExpire: null,
      savedProperties: [],
      recentlyViewed: [],
      notifications: {
        emailTourConfirmed: true,
        emailTourCancelled: true,
        emailPaymentDue: true,
        emailNewMessage: true,
        emailNewProperties: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('Admin account created successfully')
    console.log(`Admin Email: ${process.env.ADMIN_EMAIL}`)
  } catch (error) {
    console.error('Admin seeder error:', error.message)
  }
}

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const app = express()
const server = http.createServer(app)

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
]

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

app.use(compression())

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(
  express.urlencoded({ extended: true, limit: '10mb' })
)

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'realnest_fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite:
        process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
)

configurePassport()
app.use(passport.initialize())
app.use(passport.session())

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
)

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RealNest API is running...',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))
app.use('/api/broker', require('./routes/brokerDashboardRoutes'))
app.use('/api/user', require('./routes/userDashboardRoutes'))
app.use('/api/contact', require('./routes/contactRoutes'))
app.use('/api/properties', require('./routes/propertyRoutes'))
app.use('/api/brokers', require('./routes/brokerRoutes'))
app.use('/api/stats', require('./routes/statsRoutes'))
app.use('/api/testimonials', require('./routes/testimonialRoutes'))
app.use('/api/newsletter', require('./routes/newsletterRoutes'))

app.use(errorMiddleware)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`)

  socket.on('join_room', (room) => {
    socket.join(room)
    console.log(`Socket ${socket.id} joined room: ${room}`)
  })

  socket.on('send_message', (data) => {
    socket
      .to(data.conversationId)
      .emit('receive_message', data)
  })

  socket.on('leave_room', (room) => {
    socket.leave(room)
    console.log(`Socket ${socket.id} left room: ${room}`)
  })

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`)
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, async () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  )
  await seedAdmin()
})

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`)
  server.close(() => process.exit(1))
})

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`)
  process.exit(1)
})