import { Router } from 'express';
import {
  getChannels,
  createChannel,
  getOrCreateDM,
  getMessages,
  sendMessage,
  getPresence,
} from '../controllers/chatController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/workspaces/:workspaceId/presence', getPresence);
router.get('/workspaces/:workspaceId/channels', getChannels);
router.post('/workspaces/:workspaceId/channels', createChannel);
router.post('/workspaces/:workspaceId/dms/:userId', getOrCreateDM);
router.get('/workspaces/:workspaceId/channels/:channelId/messages', getMessages);
router.post('/workspaces/:workspaceId/channels/:channelId/messages', sendMessage);

export default router;