const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/userSchema");
const Wallet = require("../models/walletSchema");
require("dotenv").config();

// Configure Google authentication strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? "https://fiorawbag.store/auth/google/callback"
        : "http://localhost:3000/auth/google/callback", // Replace with your local port
      passReqToCallback: true // Important: this allows access to the request object
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Create new user
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });

          await user.save();

          // Create wallet for the new user
          const newUserWallet = new Wallet({
            userId: user._id,
            balance: 0,
          });
          await newUserWallet.save();

          // Check for referral code in cookie or session
          const referralCode = req.cookies.referralCode || req.session.referralCode;
          
          if (referralCode) {
            const referrer = await User.findById(referralCode);
            
            if (referrer && !referrer.redeemed) {
              // Set referral relationship
              user.referredBy = referrer._id;
              await user.save();

              // Apply referral bonuses
              const referralBonus = parseInt(process.env.REFERRAL_BONUS_AMOUNT) || 10;

              // Get or create referrer wallet
              let referrerWallet = await Wallet.findOne({ userId: referrer._id });
              if (!referrerWallet) {
                referrerWallet = new Wallet({
                  userId: referrer._id,
                  balance: 0,
                });
                await referrerWallet.save();
              }

              // Add bonus transactions
              await Wallet.addTransaction(referrer._id, {
                amount: referralBonus,
                type: "credit",
                status: "completed",
                source: "referral_bonus",
                description: `Referral bonus for inviting ${user.email}`,
              });

              await Wallet.addTransaction(user._id, {
                amount: referralBonus,
                type: "credit",
                status: "completed",
                source: "referral_bonus",
                description: "Referral signup bonus",
              });

              // Update referrer status
              referrer.redeemed = true;
              referrer.redeemedUsers.push(user._id);
              await referrer.save();
            }
            
            // Clear the referral code from cookie and session
            res.clearCookie('referralCode');
            delete req.session.referralCode;
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Configure Facebook authentication strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ facebookId: profile.id });

        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails ? profile.emails[0].value : "",
            facebookId: profile.id,
          });

          await user.save();

          const newUserWallet = new Wallet({
            userId: user._id,
            balance: 0,
          });
          await newUserWallet.save();

          if (global.pendingReferral && global.pendingReferral.code) {
            const referrer = await User.findById(global.pendingReferral.code);
            if (referrer && !referrer.redeemed) {
              user.referredBy = referrer._id;
              await user.save();

              const referralBonus =
                parseInt(process.env.REFERRAL_BONUS_AMOUNT) || 10;

              let referrerWallet = await Wallet.findOne({
                userId: referrer._id,
              });
              if (!referrerWallet) {
                referrerWallet = new Wallet({
                  userId: referrer._id,
                  balance: 0,
                });
                await referrerWallet.save();
              }

              await Wallet.addTransaction(referrer._id, {
                amount: referralBonus,
                type: "credit",
                status: "completed",
                source: "referral_bonus",
                description: `Referral bonus for inviting ${user.email}`,
              });

              await Wallet.addTransaction(user._id, {
                amount: referralBonus,
                type: "credit",
                status: "completed",
                source: "referral_bonus",
                description: "Referral signup bonus",
              });

              referrer.redeemed = true;
              referrer.redeemedUsers.push(user._id);
              await referrer.save();

              delete global.pendingReferral;
            }
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// User serialization/deserialization for session management
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Custom session middleware to store user ID in session
const sessionMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.session.user = req.user._id;
  }
  next();
};

module.exports = {
  passport,
  sessionMiddleware,
};
