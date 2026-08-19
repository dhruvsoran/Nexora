import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 10000 },
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
  },
  { timestamps: true }
);

export const Comment = mongoose.model('Comment', commentSchema);