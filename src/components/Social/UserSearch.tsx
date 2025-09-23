import React, { useState } from 'react';
import { Search, UserPlus, MessageCircle, Users, Clock, UserCheck } from 'lucide-react';
import { useProfile, Profile } from '../../hooks/useProfile';
import { useFriendRequests } from '../../hooks/useFriendRequests';

interface UserSearchProps {
  onStartChat: (profileId: string) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onStartChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'username' | 'display_name'>('username');
  const { searchUsers } = useProfile();
  const { sendFriendRequest, getFriendshipStatus } = useFriendRequests();
  const [friendshipStatuses, setFriendshipStatuses] = useState<{ [key: string]: string }>({});

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query, searchType);
      setSearchResults(results);

      // Check friendship status for each result
      const statuses: { [key: string]: string } = {};
      for (const user of results) {
        const status = await getFriendshipStatus(user.id);
        statuses[user.id] = status;
      }
      setFriendshipStatuses(statuses);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (profileId: string) => {
    try {
      await sendFriendRequest(profileId);
      setFriendshipStatuses(prev => ({ ...prev, [profileId]: 'pending_sent' }));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Find Users by Username
      </h3>

      {/* Search Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchType('username')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === 'username'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Username
        </button>
        <button
          onClick={() => setSearchType('display_name')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchType === 'display_name'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Display Name
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={`Search by ${searchType === 'username' ? 'username' : 'display name'}...`}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      <div className="space-y-3">
        {searchResults.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800">{user.displayName}</h4>
                <p className="text-sm text-gray-600">@{user.username}</p>
                {user.bio && (
                  <p className="text-xs text-gray-500 mt-1">{user.bio}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3" />
                  {user.isOnline ? 'Online' : formatLastSeen(user.lastSeen)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {friendshipStatuses[user.id] === 'accepted' ? (
                <button
                  onClick={() => onStartChat(user.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
              ) : friendshipStatuses[user.id] === 'pending_sent' ? (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm cursor-not-allowed"
                >
                  <Clock className="w-4 h-4" />
                  Request Sent
                </button>
              ) : friendshipStatuses[user.id] === 'pending_received' ? (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-300 text-yellow-800 rounded-lg text-sm cursor-not-allowed"
                >
                  <UserCheck className="w-4 h-4" />
                  Pending Response
                </button>
              ) : (
                <button
                  onClick={() => handleSendFriendRequest(user.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No users found with {searchType === 'username' ? 'username' : 'display name'} "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;