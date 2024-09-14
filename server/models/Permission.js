import mongoose from 'mongoose';

const { Schema } = mongoose;
const Permission = new Schema({
    _permission_title: {
        type: String,
        required: [true, 'Please provide a permission title'],
        unique: true,
        trim: true,
    },
    _permission_description: {
        type: String
    }
}, { timestamps: true });

export default mongoose.models.Permission || mongoose.model('Permission', Permission);