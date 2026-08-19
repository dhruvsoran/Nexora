import { Router } from 'express';
import {
  myWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  members,
} from '../controllers/workspaceController.js';
import { createBoard } from '../controllers/boardController.js';
import { workspaceCalendar } from '../controllers/milestoneController.js';
import { getSubscription, subscribe, cancelSubscription } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', myWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.get('/:id/members', members);
router.post('/:id/members', inviteMember);
router.patch('/:id/members/:memberId', updateMemberRole);
router.delete('/:id/members/:memberId', removeMember);
router.post('/:workspaceId/boards', createBoard);
router.get('/:workspaceId/calendar', workspaceCalendar);
router.get('/:workspaceId/subscription', getSubscription);
router.post('/:workspaceId/subscription', subscribe);
router.delete('/:workspaceId/subscription', cancelSubscription);

export default router;