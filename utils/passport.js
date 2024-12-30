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
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:1111/user/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await userSchema.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });

        if (!user) {
          user = new userSchema({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            status: true,
            isBlock: false
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        return done(error, null);
      }
    }
  )
);
