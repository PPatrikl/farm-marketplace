// src/services/storage.ts

import { supabase } from '../supabaseClient'

export interface UploadedImage {
  url: string;
  path: string; 
}

export async function uploadImages(
  files: File[],
  bucketName: string = 'listing-images'
): Promise<UploadedImage[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const uploaded: UploadedImage[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `public/${fileName}`;

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

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    if (publicUrlData?.publicUrl) {
      uploaded.push({ url: publicUrlData.publicUrl, path: data.path });
    }
  }

  return uploaded;
}