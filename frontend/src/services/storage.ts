// src/services/storage.ts
import { supabase } from '../supabaseClient'

export interface UploadedImage {
  url: string;
  path: string; // storage_path — needed by listing_images.storage_path (NOT NULL)
}

/**
 * Uploads an array of files to a Supabase Storage bucket and returns, for each file,
 * both its public URL and its storage path (needed separately because
 * listing_images.storage_path is NOT NULL and can't be derived reliably from the URL).
 *
 * @param files — Array of files from Dropzone / input
 * @param bucketName — Supabase bucket name (defaults to 'listing-images')
 * @returns Promise resolving to a list of { url, path } for each uploaded file
 */
export async function uploadImages(
  files: File[],
  bucketName: string = 'listing-images'
): Promise<UploadedImage[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const uploaded: UploadedImage[] = [];

  for (const file of files) {
    // Generate a unique file name to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `public/${fileName}`;

    // Upload the file to the bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error(`Error uploading file ${file.name}:`, error.message);
      throw error;
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    if (publicUrlData?.publicUrl) {
      uploaded.push({ url: publicUrlData.publicUrl, path: data.path });
    }
  }

  return uploaded;
}