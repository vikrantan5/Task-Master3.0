import React from 'react';
import { User, Mail, Calendar, LogOut, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const { uploadProfilePicture, deleteProfilePicture, uploading } = useProfilePicture();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadProfilePicture(file);
      await refreshProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload profile picture. Please try again.');
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return;

    try {
      await deleteProfilePicture();
      await refreshProfile();
    } catch (error) {
      console.error('Error deleting avatar:', error);
      alert('Failed to delete profile picture. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Profile</h2>
          <p className="text-gray-600">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="relative group">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                
                {/* Avatar upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <label className="cursor-pointer p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    {profile?.avatarUrl && (
                      <button
                        onClick={handleAvatarDelete}
                        disabled={uploading}
                        className="p-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
                
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {profile?.displayName || user.user_metadata?.full_name || 'User'}
                </h3>
                <p className="text-gray-600 flex items-center gap-2 justify-center sm:justify-start">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
                {profile?.username && (
                  <p className="text-gray-500 text-sm mt-1">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-800">Member Since</span>
                </div>
                <p className="text-gray-600 ml-8">
                  {formatDate(user.created_at)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-800">Account Status</span>
                </div>
                <p className="text-green-600 font-medium ml-8">
                  {user.email_confirmed_at ? 'Verified' : 'Pending Verification'}
                </p>
              </div>
            </div>

            {/* Account Actions */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h4>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h5 className="font-medium text-blue-800 mb-2">Account Information</h5>
              <p className="text-blue-700 text-sm">
                Your data is securely stored and only accessible to you. All tasks and notes are 
                private and protected by row-level security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;