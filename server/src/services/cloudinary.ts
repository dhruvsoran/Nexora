import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface UploadedFile {
  publicId: string;
  url: string;
  name: string;
  size: number;
}

export async function uploadBuffer(buffer: Buffer, folder: string): Promise<UploadedFile> {
  if (!config.cloudinary.cloudName) {
    throw new Error('Cloudinary is not configured');
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          name: folder.split('/').pop() ?? '',
          size: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function destroyFile(publicId: string): Promise<void> {
  if (!config.cloudinary.cloudName) return;
  await cloudinary.uploader.destroy(publicId);
}