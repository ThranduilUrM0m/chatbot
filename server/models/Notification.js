import mongoose from 'mongoose';

const { Schema } = mongoose;
const Notification = new Schema({
    _notification_title: {
        type: String,
        required: true
    },
    _notification_user: {
        type: Object,
        required: true
    },
    _notification_data: {
        type: Object
    },
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', Notification);