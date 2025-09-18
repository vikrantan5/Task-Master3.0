import React from 'react';
import { UserCheck, UserX, Clock } from 'lucide-react';
import { useConnections } from '../../hooks/useConnections';

const ConnectionRequests: React.FC = () => {
  const { pendingRequests, acceptConnectionRequest, rejectConnectionRequest, loading } = useConnections();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Connection Requests ({pendingRequests.length})
      </h3>

      <div className="space-y-3">
        {pendingRequests.map(request => (
          <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="relative">
                {request.profile?.avatarUrl ? (
                  <img
                    src={request.profile.avatarUrl}
                    alt={request.profile.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {request.profile?.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  request.profile?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800">{request.profile?.displayName}</h4>
                <p className="text-sm text-gray-600">@{request.profile?.username}</p>
                {request.profile?.bio && (
                  <p className="text-xs text-gray-500 mt-1">{request.profile.bio}</p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  Sent {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => acceptConnectionRequest(request.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <UserCheck className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => rejectConnectionRequest(request.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <UserX className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectionRequests;