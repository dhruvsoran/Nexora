import { Router } from 'express';
import { myNotifications, markRead, markAllRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', myNotifications);
router.post('/read', markRead);
router.post('/read-all', markAllRead);

export default router;