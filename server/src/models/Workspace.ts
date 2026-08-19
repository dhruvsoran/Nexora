import mongoose, { Schema } from 'mongoose';

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(WorkspaceRole),
      default: WorkspaceRole.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const subscriptionSchema = new Schema(
  {
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    status: { type: String, enum: ['active', 'trialing', 'canceled', 'past_due'], default: 'active' },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
  },
  { _id: false }
);

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 6 },
    logo: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    invitedEmails: { type: [String], default: [] },
    subscription: { type: subscriptionSchema, default: () => ({}) },
  },
  { timestamps: true }
);

workspaceSchema.index({ name: 'text' });

export type MemberDoc = {
  user: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
};

export const Workspace = mongoose.model('Workspace', workspaceSchema);