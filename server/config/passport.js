import passport from 'passport';
import passwordHash from 'password-hash';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import User from '../models/User.js'; // Adjust the path based on your file structure

// Local Strategy for username/password login
passport.use(
    new LocalStrategy(
        {
            usernameField: 'boutaleb', // Replace with your actual field name for username
            passwordField: 'Thr@nduilUrM0m', // Replace with your actual field name for password
        },
        async (username, password, done) => {
            try {
                const user = await User.findOne({ _user_username: username });
                if (!user) {
                    return done(null, false, { message: 'Invalid username' });
                }

                const isMatch = await passwordHash.verify(password, user._user_password);
                if (!isMatch) {
                    return done(null, false, { message: 'Invalid password' });
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// JWT Strategy for token authentication
passport.use(
    new JwtStrategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: '_boutaleb', // Replace with your actual secret key
        },
        async (payload, done) => {
            try {
                const user = await User.findById(payload.sub);
                if (!user) {
                    return done(null, false);
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);