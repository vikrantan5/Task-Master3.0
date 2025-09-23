import React from 'react';
import { UserCheck, UserX, Clock, Users } from 'lucide-react';
import { useFriendRequests } from '../../hooks/useFriendRequests';

const FriendRequestsManager: React.FC = () => {
  const { 
    receivedRequests, 
    sentRequests, 
    loading, 
    acceptFriendRequest, 
    rejectFriendRequest 
  } = useFriendRequests();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const pendingReceived = receivedRequests.filter(req => req.status === 'pending');
  const pendingSent = sentRequests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Received Friend Requests */}
      {pendingReceived.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Friend Requests ({pendingReceived.length})
          </h3>

          <div className="space-y-3">
            {pendingReceived.map(request => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {request.senderProfile?.avatarUrl ? (
                      <img
                        src={request.senderProfile.avatarUrl}
                        alt={request.senderProfile.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {request.senderProfile?.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      request.senderProfile?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800">{request.senderProfile?.displayName}</h4>
                    <p className="text-sm text-gray-600">@{request.senderProfile?.username}</p>
                    {request.senderProfile?.bio && (
                      <p className="text-xs text-gray-500 mt-1">{request.senderProfile.bio}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      Sent {request.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    disabled={loading}
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
      )}

      {/* Sent Friend Requests */}
      {pendingSent.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sent Requests ({pendingSent.length})
          </h3>

          <div className="space-y-3">
            {pendingSent.map(request => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {request.receiverProfile?.avatarUrl ? (
                      <img
                        src={request.receiverProfile.avatarUrl}
                        alt={request.receiverProfile.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {request.receiverProfile?.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      request.receiverProfile?.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800">{request.receiverProfile?.displayName}</h4>
                    <p className="text-sm text-gray-600">@{request.receiverProfile?.username}</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Sent {request.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                  Pending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingReceived.length === 0 && pendingSent.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pending friend requests</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendRequestsManager;