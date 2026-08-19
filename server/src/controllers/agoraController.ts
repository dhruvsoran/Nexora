import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';
import { startVoiceAgent, leaveVoiceAgent, getVoiceAgentStatus, buildRtcToken } from '../services/agora';

function randomUid(): number {
  return Math.floor(Math.random() * (2 ** 31 - 2)) + 1;
}

export async function createVoiceSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = String(req.user!._id);
    const context = typeof (req.body as { context?: unknown })?.context === 'string' ? (req.body as { context: string }).context : undefined;
    const channel = `nexora-ai-${userId}`;

    let userUid = randomUid();
    let agentUid = randomUid();
    while (agentUid === userUid) agentUid = randomUid();

    const session = await startVoiceAgent({ channel, agentUid, userUid, context });
    const userToken = buildRtcToken(channel, userUid);

    res.json({
      success: true,
      data: {
        appId: session.appId,
        agentId: session.agentId,
        channel: session.channel,
        userUid: session.userUid,
        userToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function stopVoiceSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { agentId } = req.params;
    if (!agentId) throw ApiError.badRequest('agentId is required');
    await leaveVoiceAgent(agentId);
    res.json({ success: true, data: { status: 'IDLE' } });
  } catch (err) {
    next(err);
  }
}

export async function getVoiceSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { agentId } = req.params;
    if (!agentId) throw ApiError.badRequest('agentId is required');
    const data = await getVoiceAgentStatus(agentId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}