const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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
    },
    (accessToken, refreshToken, profile, done) => {
      // Handle user data here
      console.log('User Profile:', profile);
      return done(null, profile);
    }
  )
);


    