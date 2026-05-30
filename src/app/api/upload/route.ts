import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'avatar'; // 'avatar' | 'residence-card'
    const employeeCode = formData.get('employeeCode') as string || 'unknown';
    const status = formData.get('status') as string || 'valid'; // 'valid' | 'expired'

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // 1. File size check (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return errorResponse('File size exceeds the 5MB limit.', 400);
    }

    // 2. MIME type check
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse('Invalid file type. Only JPEG, PNG, GIF, WEBP images and PDF files are allowed.', 400);
    }

    // 3. Extension check
    const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
      return errorResponse('Invalid file extension.', 400);
    }
    const ext = rawExt;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();

    // 1. Cloudinary Upload
    if (isCloudinaryConfigured) {
      console.log('[UPLOAD] Uploading to Cloudinary...');
      const base64Data = buffer.toString('base64');
      const fileUri = `data:${file.type || 'image/png'};base64,${base64Data}`;
      
      const folder = type === 'avatar' ? 'avatars' : 'residence-cards';
      const publicId = type === 'avatar' 
        ? `avatar_${employeeCode}_${timestamp}`
        : `card_${employeeCode}_${status}_${timestamp}`;

      const result = await cloudinary.uploader.upload(fileUri, {
        folder,
        public_id: publicId,
        resource_type: 'image',
      });

      return successResponse({ url: result.secure_url });
    }

    // 2. Local Fallback Upload
    console.log('[UPLOAD] Cloudinary not configured. Falling back to local filesystem storage.');
    const filename = type === 'avatar' 
      ? `avatar_${employeeCode}_${timestamp}.${ext}`
      : `card_${employeeCode}_${status}_${timestamp}.${ext}`;
      
    const relativeDir = type === 'avatar' ? 'avatars' : 'residence-cards';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', relativeDir);
    
    // Ensure directory exists
    fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${relativeDir}/${filename}`;
    return successResponse({ url: publicUrl });

  } catch (error) {
    return handleApiError(error);
  }
}
