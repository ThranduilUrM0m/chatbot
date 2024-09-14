import mongoose from 'mongoose';

const { Schema } = mongoose;
const Token = new Schema({
    User: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    _userIsVerified: {
        type: Boolean,
        default: false
    },
    _token_body: {
        type: String,
        required: true
    }
}, { timestamps: true });

Token.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7, partialFilterExpression: { _userIsVerified: { $eq: true } } })
export default mongoose.models.Token || mongoose.model('Token', Token);