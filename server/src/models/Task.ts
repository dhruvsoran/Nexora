import mongoose, { Schema } from 'mongoose';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

const taskSchema = new Schema(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    columnId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 10000 },
    order: { type: Number, default: 0 },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },
    labels: { type: [String], default: [] },
    storyPoints: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date, default: null },
    assignees: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    attachments: {
      type: [
        {
          publicId: { type: String, required: true },
          url: { type: String, required: true },
          name: { type: String, default: '' },
          size: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
    dependencies: { type: [Schema.Types.ObjectId], ref: 'Task', default: [] },
    subtasks: {
      type: [
        {
          title: { type: String, required: true, maxlength: 200 },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    timeEstimate: { type: Number, min: 0, default: 0 },
    timeSpent: { type: Number, min: 0, default: 0 },
    milestone: { type: Schema.Types.ObjectId, ref: 'Milestone', default: null },
    voiceNotes: {
      type: [
        {
          publicId: { type: String, required: true },
          url: { type: String, required: true },
          durationMs: { type: Number, default: 0 },
          mime: { type: String, default: 'audio/webm' },
          by: {
            _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, default: '' },
          },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ board: 1, columnId: 1, order: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ milestone: 1 });
taskSchema.index({ dueDate: 1 });

export type TaskAttachment = { publicId: string; url: string; name: string; size: number };

export type TaskSubtask = { title: string; done: boolean; _id?: mongoose.Types.ObjectId };

export const Task = mongoose.model('Task', taskSchema);