import mongoose, { Schema } from 'mongoose';

export enum AuditAction {
  USER_REGISTERED = 'user_registered',
  USER_UPDATED = 'user_updated',
  ROLE_CHANGED = 'role_changed',
  USER_SUSPENDED = 'user_suspended',
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_DELETED = 'workspace_deleted',
  BOARD_CREATED = 'board_created',
  BOARD_DELETED = 'board_deleted',
  SUBSCRIPTION_CHANGED = 'subscription_changed',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    details: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);