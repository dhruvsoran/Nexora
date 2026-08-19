import { Router } from 'express';
import {
  summarizeBoard,
  summarizeTask,
  estimateStoryPoints,
  suggestLabels,
  generateTasks,
  prioritizeTasks,
  detectRisks,
  weeklyReport,
} from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/boards/:boardId/ai/summary', summarizeBoard);
router.get('/boards/:boardId/tasks/:taskId/ai/summary', summarizeTask);
router.post('/boards/:boardId/ai/estimate', estimateStoryPoints);
router.post('/boards/:boardId/ai/labels', suggestLabels);
router.post('/boards/:boardId/ai/generate', generateTasks);
router.post('/boards/:boardId/ai/prioritize', prioritizeTasks);
router.post('/boards/:boardId/ai/risks', detectRisks);
router.get('/workspaces/:workspaceId/ai/report', weeklyReport);

export default router;