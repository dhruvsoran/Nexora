import { AuditLog, AuditAction } from '../models/AuditLog.js';

export async function recordAudit(
  actor: string | null,
  action: AuditAction,
  targetType = '',
  targetId = '',
  details = '',
  ip = ''
): Promise<void> {
  try {
    await AuditLog.create({ actor, action, targetType, targetId, details, ip });
  } catch {
    // audit logging must never break the main request
  }
}