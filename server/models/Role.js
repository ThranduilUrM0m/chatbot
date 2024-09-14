import mongoose from 'mongoose';

const { Schema } = mongoose;
const Role = new Schema({
    _role_title: {
        type: String,
        required: [true, 'Please provide a role title'],
        unique: true,
        trim: true,
    },
    _role_description: {
        type: String
    },
    Permission: [{
        type: Schema.Types.ObjectId,
        required: false,
        ref: 'Permission',
    }],
}, { timestamps: true });

export default mongoose.models.Role || mongoose.model('Role', Role);