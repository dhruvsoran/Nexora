import mongoose, { Schema } from 'mongoose';

const milestoneSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#f97316' },
    dueDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

milestoneSchema.index({ board: 1, dueDate: 1 });

export const Milestone = mongoose.model('Milestone', milestoneSchema);