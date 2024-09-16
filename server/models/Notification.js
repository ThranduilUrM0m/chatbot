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

// TTL Index: Expire all documents after 24 hours (60 * 60 * 24 seconds)
Notification.index(
    { updatedAt: 1 },  // Index on 'updatedAt' field (from timestamps)
    { expireAfterSeconds: 60 * 60 * 24 }  // 24 hours TTL (no conditions)
);
export default mongoose.models.Notification || mongoose.model('Notification', Notification);