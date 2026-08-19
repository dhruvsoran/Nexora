import mongoose, { Schema, InferSchemaType } from 'mongoose';

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
}

const invitationSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: Object.values(InviteStatus), default: InviteStatus.PENDING, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export type InvitationDoc = InferSchemaType<typeof invitationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Invitation = mongoose.model('Invitation', invitationSchema);