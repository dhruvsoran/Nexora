import mongoose, { Schema } from 'mongoose';

const columnSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    color: { type: String, default: '#64748b' },
    order: { type: Number, default: 0 },
    limit: { type: Number, default: 0 },
  },
  { _id: true }
);

const boardSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 6 },
    color: { type: String, default: '#0d9488' },
    columns: { type: [columnSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

boardSchema.index({ name: 'text', key: 'text' });
boardSchema.index({ workspace: 1, archived: 1 });

export type ColumnDoc = {
  _id?: mongoose.Types.ObjectId;
  name: string;
  color: string;
  order: number;
  limit: number;
};

export const Board = mongoose.model('Board', boardSchema);