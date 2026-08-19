import { api } from './client';

export interface UploadedFile {
  url: string;
  publicId: string;
  name: string;
  size: number;
}

export function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append('file', file);
  return api.post<{ data: { file: UploadedFile } }>('/upload', form).then((r) => r.data.data.file);
}