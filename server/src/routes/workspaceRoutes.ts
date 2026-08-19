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
} from '../controllers/workspaceController';
import { createBoard } from '../controllers/boardController';
import { workspaceCalendar } from '../controllers/milestoneController';
import { getSubscription, subscribe, cancelSubscription } from '../controllers/subscriptionController';
import { protect } from '../middleware/auth';

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