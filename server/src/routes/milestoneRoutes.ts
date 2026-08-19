import { Router } from 'express';
import {
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '../controllers/milestoneController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/boards/:boardId/milestones', listMilestones);
router.post('/boards/:boardId/milestones', createMilestone);
router.patch('/milestones/:id', updateMilestone);
router.delete('/milestones/:id', deleteMilestone);

export default router;
