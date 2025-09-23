import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, Phone, Video } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useWebRTC } from '../../hooks/useWebRTC';
import UserSearch from './UserSearch';
import FriendRequestsManager from './FriendRequestsManager';
import FriendsList from './FriendsList';
import ChatWindow from './ChatWindow';
import VideoCallWindow from './VideoCallWindow';

const SocialPage: React.FC = () => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const { profile, updateOnlineStatus } = useProfile();
  const { initializeCall } = useWebRTC();

  useEffect(() => {
    // Connect to socket when component mounts
    if (profile?.id) {
      updateOnlineStatus(true);
    }

    // Cleanup on unmount
    return () => {
      if (profile?.id) {
        updateOnlineStatus(false);
      }
    };
  }, [profile?.id]);

  const handleStartChat = (profileId: string) => {
    setActiveChat(profileId);
  };

  const handleStartCall = async (profileId: string, callType: 'audio' | 'video') => {
    setShowVideoCall(true);
    try {
      await initializeCall(profileId, callType);
    } catch (error) {
      console.error('Error starting call:', error);
      setShowVideoCall(false);
    }
  };

  const handleCloseChat = () => {
    setActiveChat(null);
  };

  const handleCloseVideoCall = () => {
    setShowVideoCall(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Social Hub</h2>
              <p className="text-gray-600">Connect with friends and stay productive together</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Online</span>
              {profile && (
                <span className="ml-4 font-medium">@{profile.username}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Search & Friend Requests */}
            <div className="space-y-6">
              <UserSearch onStartChat={handleStartChat} />
              <FriendRequestsManager />
            </div>

            {/* Right Column - Friends List */}
            <div className="space-y-6">
              <FriendsList 
                onStartChat={handleStartChat}
                onStartCall={handleStartCall}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {activeChat && (
        <ChatWindow
          chatUserId={activeChat}
          onClose={handleCloseChat}
          onStartCall={handleStartCall}
        />
      )}

      {/* Video Call Window */}
      {showVideoCall && (
        <VideoCallWindow onClose={handleCloseVideoCall} />
      )}
    </div>
  );
};

export default SocialPage;