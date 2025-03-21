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
      callbackURL:
        process.env.NODE_ENV === "Production"
          ? "https://fiorawbag.store/auth/google/callback"
          : "http://localhost:3002/auth/google/callback",
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
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
