import { Router } from 'express';
import { boardStats, burndown, workspaceActivity } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/boards/:boardId/stats', boardStats);
router.get('/boards/:boardId/burndown', burndown);
router.get('/workspaces/:workspaceId/activity', workspaceActivity);

export default router;