import React from 'react';
import { MessageCircle, Phone, Video, Users, Clock, UserMinus } from 'lucide-react';
import { useFriendRequests } from '../../hooks/useFriendRequests';

interface FriendsListProps {
  onStartChat: (profileId: string) => void;
  onStartCall: (profileId: string, callType: 'audio' | 'video') => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ onStartChat, onStartCall }) => {
  const { friends, loading, removeFriend } = useFriendRequests();

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Your Friends
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No friends yet</p>
          <p className="text-sm">Send friend requests to connect with others!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Your Friends ({friends.length})
      </h3>

      <div className="space-y-3">
        {friends.map(friend => (
          <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative">
                {friend.avatarUrl ? (
                  <img
                    src={friend.avatarUrl}
                    alt={friend.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {friend.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800">{friend.displayName}</h4>
                <p className="text-sm text-gray-600">@{friend.username}</p>
                {friend.bio && (
                  <p className="text-xs text-gray-500 mt-1">{friend.bio}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3" />
                  {friend.isOnline ? 'Online' : formatLastSeen(friend.lastSeen)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onStartChat(friend.id)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Start Chat"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => onStartCall(friend.id, 'audio')}
                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                title="Audio Call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={() => onStartCall(friend.id, 'video')}
                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                onClick={() => removeFriend(friend.id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Remove Friend"
              >
                <UserMinus className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;