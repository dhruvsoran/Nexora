import { Router } from 'express';
import {
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '../controllers/milestoneController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/boards/:boardId/milestones', listMilestones);
router.post('/boards/:boardId/milestones', createMilestone);
router.patch('/milestones/:id', updateMilestone);
router.delete('/milestones/:id', deleteMilestone);

export default router;
