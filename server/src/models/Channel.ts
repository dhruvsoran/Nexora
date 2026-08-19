import mongoose, { Schema } from 'mongoose';

export enum ChannelType {
  CHANNEL = 'channel',
  DIRECT = 'direct',
}

const channelSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, trim: true, maxlength: 100 },
    type: { type: String, enum: Object.values(ChannelType), default: ChannelType.CHANNEL },
    description: { type: String, default: '' },
    members: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

channelSchema.index({ workspace: 1, type: 1 });
channelSchema.index({ workspace: 1, name: 1 }, { unique: true, partialFilterExpression: { type: ChannelType.CHANNEL } });

export const Channel = mongoose.model('Channel', channelSchema);