import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema(
  {
    channel: { type: Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 5000 },
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
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

messageSchema.index({ channel: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);