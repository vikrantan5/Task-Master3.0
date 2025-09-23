import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useProfilePicture = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const uploadProfilePicture = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    setUploading(true);

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      if (file.size > 2097152) { // 2MB
        throw new Error('File size must be less than 2MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete old avatar if exists
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();

      if (currentProfile?.avatar_url) {
        // Extract file path from URL
        const oldPath = currentProfile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage
          .from('avatars')
          .remove([oldPath]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteProfilePicture = async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    setUploading(true);

    try {
      // Get current avatar URL
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();

      if (currentProfile?.avatar_url) {
        // Extract file path from URL
        const filePath = currentProfile.avatar_url.split('/').slice(-2).join('/');
        
        // Delete from storage
        await supabase.storage
          .from('avatars')
          .remove([filePath]);
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadProfilePicture,
    deleteProfilePicture,
    uploading
  };
};