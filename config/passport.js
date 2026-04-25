const passport = require('passport')
const User = require('../models/User')

const configurePassport = () => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID === 'your_google_client_id' ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET === 'your_google_client_secret'
  ) {
    console.warn('Google OAuth credentials not configured. Google login will not work.')
    return passport
  }

  const GoogleStrategy = require('passport-google-oauth20').Strategy

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value
          const name = profile.displayName
          const avatar = profile.photos[0]?.value || ''
          const googleId = profile.id

          let user = await User.findOne({ googleId })

          if (user) {
            if (!user.isActive) {
              return done(null, false, {
                message: 'Your account has been deactivated.',
              })
            }
            return done(null, user)
          }

          user = await User.findOne({ email })

          if (user) {
            if (!user.isActive) {
              return done(null, false, {
                message: 'Your account has been deactivated.',
              })
            }
            user.googleId = googleId
            if (!user.avatar) user.avatar = avatar
            await user.save()
            return done(null, user)
          }

          const newUser = await User.create({
            name,
            email,
            googleId,
            avatar,
            role: 'user',
            isActive: true,
            isVerified: true,
            brokerStatus: 'approved',
          })

          return done(null, newUser)
        } catch (error) {
          return done(error, false)
        }
      }
    )
  )

  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (error) {
      done(error, null)
    }
  })

  console.log('Google OAuth strategy configured successfully')
  return passport
}

module.exports = configurePassport