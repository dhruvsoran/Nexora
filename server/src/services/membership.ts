import { WorkspaceRole, MemberDoc } from '../models/Workspace.js';
import { ApiError } from '../utils/ApiError.js';

export function getRole(members: MemberDoc[], userId: string): WorkspaceRole | null {
  const member = members.find(
    (m) => String(m.user) === String(userId)
  );
  return member ? member.role : null;
}

export function isMember(members: MemberDoc[], userId: string): boolean {
  return getRole(members, userId) !== null;
}

export function requireRole(members: MemberDoc[], userId: string, roles: WorkspaceRole[]): WorkspaceRole {
  const role = getRole(members, userId);
  if (!role) throw ApiError.forbidden('You are not a member of this workspace');
  if (!roles.includes(role)) throw ApiError.forbidden('You do not have permission for this action');
  return role;
}

export const CAN_MANAGE = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[];