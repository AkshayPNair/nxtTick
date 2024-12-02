const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userSchema=require("../model/userModel")
require("dotenv").config


// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENTID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:1111/user/auth/google/callback',
      passReqToCallback: true, 
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Profile received:', profile);

        let user = await userSchema.findOne({ googleId: profile.id });

        if (!user) {
          console.log('New user, creating...');
          user = new userSchema({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });

          await user.save();
        } else {
          console.log('Existing user found:', user);
        }
        req.session.user = {
          id: user._id,
          name: user.name,
          email: user.email,
        };
        console.log('Session created:', req.session.user);

        return done(null, user);
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        return done(error, null);
      }
    }
  )
);
