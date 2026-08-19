import { Router } from 'express';
import { createVoiceSession, stopVoiceSession, getVoiceSession } from '../controllers/agoraController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.post('/agora/voice/session', createVoiceSession);
router.post('/agora/voice/session/:agentId/leave', stopVoiceSession);
router.get('/agora/voice/session/:agentId', getVoiceSession);

export default router;