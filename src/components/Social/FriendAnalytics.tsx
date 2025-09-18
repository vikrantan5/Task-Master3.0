import React from 'react';
import { TrendingUp, CheckSquare, FileText, Clock, Users } from 'lucide-react';
import { useFriendAnalytics } from '../../hooks/useFriendAnalytics';

const FriendAnalytics: React.FC = () => {
  const { friendAnalytics, loading } = useFriendAnalytics();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (friendAnalytics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Friends Activity
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No friend activity to show</p>
          <p className="text-sm">Connect with friends to see their productivity!</p>
        </div>
      </div>
    );
  }

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
        <TrendingUp className="w-5 h-5" />
        Friends Activity
      </h3>

      <div className="space-y-4">
        {friendAnalytics.map(friend => (
          <div key={friend.profileId} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {friend.avatarUrl ? (
                    <img
                      src={friend.avatarUrl}
                      alt={friend.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {friend.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">{friend.displayName}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {friend.isOnline ? 'Online' : formatLastSeen(friend.lastSeen)}
                  </div>
                </div>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                friend.productivityScore >= 80 
                  ? 'bg-green-100 text-green-800'
                  : friend.productivityScore >= 60
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {friend.productivityScore.toFixed(0)} score
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-gray-600">Today: {friend.todayCompletedTasks}/{friend.todayTasks}</p>
                  <p className="text-xs text-gray-500">Week: {friend.weekCompletedTasks}/{friend.weekTasks}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-gray-600">Today: {friend.todayNotes} notes</p>
                  <p className="text-xs text-gray-500">Week: {friend.weekNotes} notes</p>
                </div>
              </div>
            </div>

            {friend.completionRate > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Completion Rate</span>
                  <span>{friend.completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${friend.completionRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendAnalytics;