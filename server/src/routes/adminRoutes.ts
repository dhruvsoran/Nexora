import { Router } from 'express';
import {
  adminStats,
  auditLogs,
  listUsers,
  updateUserRole,
  suspendUser,
  listWorkspaces,
} from '../controllers/adminController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

router.use(protect, adminOnly);

router.get('/stats', adminStats);
router.get('/audit-logs', auditLogs);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/suspend', suspendUser);
router.get('/workspaces', listWorkspaces);

export default router;
