import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createInvite,
  getInvite,
  acceptInvite,
  listInvites,
  revokeInvite,
} from '../controllers/inviteController';
import { protect } from '../middleware/auth';

const router = Router();

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many invitations sent, try again later' },
});

router.post('/', protect, inviteLimiter, createInvite);
router.get('/workspace/:workspaceId', protect, listInvites);
router.delete('/:id', protect, revokeInvite);

router.get('/:token', getInvite);
router.post('/:token/accept', protect, acceptInvite);

export default router;