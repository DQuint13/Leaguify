const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AVATAR_BUCKET_NAME || process.env.S3_BUCKET_NAME;

async function uploadAvatar(imageBuffer, contentType) {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket name not configured');
  }

  // Validate image type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    throw new Error('Invalid image type. Only JPEG, PNG, and WebP are allowed.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (imageBuffer.length > maxSize) {
    throw new Error('Image size exceeds 5MB limit.');
  }

  // Resize and optimize image
  const resizedImage = await sharp(imageBuffer)
    .resize(200, 200, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Generate unique filename
  const filename = `avatars/${uuidv4()}.jpg`;
  const key = filename;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: resizedImage,
    ContentType: 'image/jpeg',
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  return publicUrl;
}

module.exports = {
  uploadAvatar,
};
