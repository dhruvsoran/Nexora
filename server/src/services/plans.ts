export type PlanId = 'free' | 'pro' | 'business';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  period: 'month' | 'year';
  description: string;
  features: string[];
  limits: { boards: number; members: number; storageMb: number };
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'For individuals and small side projects',
    features: ['Up to 2 boards', 'Up to 5 members', 'Basic task & kanban tools', 'Community support'],
    limits: { boards: 2, members: 5, storageMb: 256 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    period: 'month',
    description: 'For growing teams that need more power',
    features: ['Unlimited boards', 'Up to 25 members', 'Milestones, dependencies & time tracking', 'AI project assistant', 'Calendar view'],
    limits: { boards: -1, members: 25, storageMb: 5120 },
  },
  {
    id: 'business',
    name: 'Business',
    price: 19,
    period: 'month',
    description: 'For organizations that need advanced controls',
    features: ['Unlimited boards & members', 'Weekly AI reports & risk detection', 'Priority support', 'Audit trail & admin controls'],
    limits: { boards: -1, members: -1, storageMb: 15360 },
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}