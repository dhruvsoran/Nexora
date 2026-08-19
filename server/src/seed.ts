import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { User } from './models/User';
import { Workspace, WorkspaceRole } from './models/Workspace';
import { Board, ColumnDoc } from './models/Board';
import { Task, TaskPriority } from './models/Task';
import { Comment } from './models/Comment';
import { Channel, ChannelType } from './models/Channel';
import { Message } from './models/Message';
import { Activity, ActivityType } from './models/Activity';
import { Notification, NotificationType } from './models/Notification';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongodbUri);
  console.log('Connected. Resetting demo data...');

  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Board.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Channel.deleteMany({}),
    Message.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const hash = await bcrypt.hash('password123', 10);

  const admin = await User.create({
    name: 'Ada Lovelace',
    email: 'ada@nexora.dev',
    password: hash,
    title: 'Product Lead',
  });
  const alice = await User.create({
    name: 'Alice Chen',
    email: 'alice@nexora.dev',
    password: hash,
    title: 'Frontend Engineer',
  });
  const bob = await User.create({
    name: 'Bob Garcia',
    email: 'bob@nexora.dev',
    password: hash,
    title: 'Backend Engineer',
  });

  const ws = await Workspace.create({
    name: 'Acme Launch',
    description: 'Ship the Acme platform MVP',
    key: 'ACM',
    owner: admin._id,
    members: [
      { user: admin._id, role: WorkspaceRole.OWNER },
      { user: alice._id, role: WorkspaceRole.MEMBER },
      { user: bob._id, role: WorkspaceRole.MEMBER },
    ],
  });

  const board = await Board.create({
    workspace: ws._id,
    name: 'Sprint 1',
    description: 'First release of the platform',
    key: 'SP1',
    color: '#0d9488',
    createdBy: admin._id,
    columns: [
      { name: 'To Do', color: '#64748b', order: 0 },
      { name: 'In Progress', color: '#0d9488', order: 1 },
      { name: 'Done', color: '#22c55e', order: 2 },
    ],
  });

  const cols = (board.columns as ColumnDoc[]).sort((a, b) => a.order - b.order);
  const [todo, inProgress, done] = cols;

  const t1 = await Task.create({
    board: board._id,
    workspace: ws._id,
    columnId: todo._id,
    title: 'Design landing page hero',
    description: 'Create hero section with product screenshot and CTA.',
    order: 0,
    priority: TaskPriority.HIGH,
    labels: ['design', 'marketing'],
    storyPoints: 3,
    dueDate: new Date(Date.now() + 2 * 86400000),
    assignees: [alice._id],
    createdBy: admin._id,
  });

  const t2 = await Task.create({
    board: board._id,
    workspace: ws._id,
    columnId: todo._id,
    title: 'Implement JWT refresh flow',
    description: 'Add refresh token rotation and Redis blacklist.',
    order: 1,
    priority: TaskPriority.URGENT,
    labels: ['backend', 'auth'],
    storyPoints: 8,
    dueDate: new Date(Date.now() + 4 * 86400000),
    assignees: [bob._id],
    createdBy: admin._id,
  });

  const t3 = await Task.create({
    board: board._id,
    workspace: ws._id,
    columnId: inProgress._id,
    title: 'Set up Socket.IO presence',
    description: 'Show online members per workspace in real time.',
    order: 0,
    priority: TaskPriority.MEDIUM,
    labels: ['realtime'],
    storyPoints: 5,
    dueDate: new Date(Date.now() + 3 * 86400000),
    assignees: [bob._id],
    createdBy: alice._id,
  });

  const t4 = await Task.create({
    board: board._id,
    workspace: ws._id,
    columnId: done._id,
    title: 'Seed the database',
    description: 'Create demo users, workspace and board.',
    order: 0,
    priority: TaskPriority.MEDIUM,
    labels: ['backend'],
    storyPoints: 2,
    completedAt: new Date(),
    assignees: [admin._id],
    createdBy: admin._id,
  });

  await Comment.create({
    task: t1._id,
    board: board._id,
    workspace: ws._id,
    author: alice._id,
    body: 'Working on this now, will share a Figma link soon.',
  });

  await Comment.create({
    task: t2._id,
    board: board._id,
    workspace: ws._id,
    author: bob._id,
    body: 'Refresh rotation is almost done, needs review.',
  });

  const general = await Channel.create({
    workspace: ws._id,
    name: 'general',
    type: ChannelType.CHANNEL,
    description: 'Team-wide announcements',
    createdBy: admin._id,
    members: [admin._id, alice._id, bob._id],
  });

  const dm = await Channel.create({
    workspace: ws._id,
    type: ChannelType.DIRECT,
    members: [admin._id, bob._id],
    createdBy: admin._id,
  });

  await Message.create({
    channel: general._id,
    workspace: ws._id,
    sender: admin._id,
    body: 'Welcome everyone! Demo credentials: ada@nexora.dev / password123',
  });
  await Message.create({
    channel: general._id,
    workspace: ws._id,
    sender: bob._id,
    body: 'Sprint 1 looks good, I will pick up the auth task.',
  });
  await Message.create({
    channel: dm._id,
    workspace: ws._id,
    sender: bob._id,
    body: 'Heads up: refresh token PR is ready for review.',
  });

  const events: Array<[typeof t1, typeof admin._id, ActivityType, string]> = [
    [t1, admin._id, ActivityType.CREATED, 'created this task'],
    [t2, admin._id, ActivityType.CREATED, 'created this task'],
    [t3, alice._id, ActivityType.MOVED, 'moved the task to In Progress'],
    [t4, admin._id, ActivityType.CREATED, 'created this task'],
  ];
  for (const [task, author, type, message] of events) {
    await Activity.create({
      task: task._id,
      board: board._id,
      workspace: ws._id,
      author,
      type,
      message,
    });
  }

  await Notification.create({
    user: bob._id,
    workspace: ws._id,
    type: NotificationType.TASK_ASSIGNED,
    title: 'You were assigned to "Implement JWT refresh flow"',
    body: 'Acme Launch',
    link: `/workspaces/${String(ws._id)}/boards/${String(board._id)}`,
    actor: admin._id,
  });

  console.log('Seed complete!');
  console.log('Log in with: ada@nexora.dev / password123');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});