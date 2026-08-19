import mongoose, { Schema } from 'mongoose';

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_MENTIONED = 'task_mentioned',
  TASK_UPDATED = 'task_updated',
  COMMENT = 'comment',
  MESSAGE = 'message',
  INVITE = 'invite',
  MEMBER_JOINED = 'member_joined',
}

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);