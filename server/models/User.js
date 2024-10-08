import mongoose from 'mongoose';
import passwordHash from 'password-hash';
import jwt from 'jsonwebtoken';

const { Schema } = mongoose;
const User = new Schema({
    _user_email: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        required: true
    },
    _user_username: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    _user_password: {
        type: String,
        required: true
    },
    _user_fingerprint: {
        type: String
    },
    _user_picture: {
        type: String,
    },
    _user_firstname: {
        type: String,
        trim: true
    },
    _user_lastname: {
        type: String,
        trim: true
    },
    _user_city: {
        type: String,
        trim: true
    },
    _user_country: {
        _code: {
            type: String,
            trim: true
        },
        _country: {
            type: String,
            trim: true
        }
    },
    _user_phone: {
        type: String
    },
    _user_isVerified: {
        type: Boolean,
        default: false
    },
    _user_isActive: {
        type: Boolean,
        default: false
    },
    _user_logindate: [{
        type: Date
    }],
    Role: [{
        type: Schema.Types.ObjectId,
        required: false,
        ref: 'Role'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true }
});

// Pre-save hook to set the default Role to "User"
User.pre('save', async function (next) {
    // Only set the default role if none has been assigned
    if (!this.Role || this.Role.length === 0) {
        const RoleModel = mongoose.model('Role');
        
        // Find the role with _role_title equal to 'User'
        const defaultRole = await RoleModel.findOne({ _role_title: 'Administrateur' });
        
        if (defaultRole) {
            this.Role = [defaultRole._id];  // Set the default role as "User"
        }
    }
    next();
});

User.methods = {
    authenticate: async (_userPasswordValue, findUser) => {
        return await passwordHash.verify(_userPasswordValue, findUser._user_password);
    },
    
    /* In JavaScript, arrow functions do not have their own this context, and they inherit the this context from the surrounding code. In this case, when using an arrow function for getToken, the this inside the function does not refer to the User model, but rather to the global context */
    getToken: function () {
        return jwt.sign({ sub: this._id }, '_chatbot'); // Replace with your actual secret key
    },
}

export default mongoose.models.User || mongoose.model('User', User);