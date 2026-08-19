import mongoose, { Schema } from 'mongoose';

export enum ActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  MOVED = 'moved',
  COMMENTED = 'commented',
  DELETED = 'deleted',
}

const activitySchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(ActivityType), required: true },
    message: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Activity = mongoose.model('Activity', activitySchema);