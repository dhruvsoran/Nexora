import { Router } from 'express';
import { boardStats, burndown, workspaceActivity } from '../controllers/analyticsController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/boards/:boardId/stats', boardStats);
router.get('/boards/:boardId/burndown', burndown);
router.get('/workspaces/:workspaceId/activity', workspaceActivity);

export default router;