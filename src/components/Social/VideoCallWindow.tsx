import React, { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Wifi, WifiOff } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';

interface VideoCallWindowProps {
  onClose: () => void;
}

const VideoCallWindow: React.FC<VideoCallWindowProps> = ({ onClose }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    connectionState,
    acceptCall: acceptWebRTCCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall(callState.callId);
    onClose();
  };

  const handleAcceptCall = () => {
    if (callState.callId && callState.remoteUserId) {
      // This would need the offer from the call state
      // acceptWebRTCCall(callState.callId, offer, callState.remoteUserId, callState.callType);
    }
  };

  const handleRejectCall = () => {
    if (callState.callId && callState.remoteUserId) {
      rejectCall(callState.callId, callState.remoteUserId);
    }
    onClose();
  };

  if (!callState.isInCall && !callState.isIncomingCall && !callState.isOutgoingCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Incoming call screen */}
      {callState.isIncomingCall && (
        <div className="flex-1 flex flex-col items-center justify-center text-white">
          <div className="text-center mb-8">
            {callState.remoteUserProfile?.avatarUrl ? (
              <img
                src={callState.remoteUserProfile.avatarUrl}
                alt={callState.remoteUserProfile.displayName}
                className="w-32 h-32 rounded-full object-cover mb-4 mx-auto"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 mx-auto">
                {callState.remoteUserProfile?.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-semibold mb-2">{callState.remoteUserProfile?.displayName}</h2>
            <p className="text-gray-300">Incoming {callState.callType} call...</p>
          </div>
          
          <div className="flex gap-6">
            <button
              onClick={handleRejectCall}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
            >
              <Phone className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Outgoing call screen */}
      {callState.isOutgoingCall && (
        <div className="flex-1 flex flex-col items-center justify-center text-white">
          <div className="text-center mb-8">
            {callState.remoteUserProfile?.avatarUrl ? (
              <img
                src={callState.remoteUserProfile.avatarUrl}
                alt={callState.remoteUserProfile.displayName}
                className="w-32 h-32 rounded-full object-cover mb-4 mx-auto"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 mx-auto">
                {callState.remoteUserProfile?.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-semibold mb-2">{callState.remoteUserProfile?.displayName}</h2>
            <p className="text-gray-300">Calling...</p>
          </div>
          
          <div className="flex gap-6">
            <button
              onClick={handleEndCall}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Active call screen */}
      {callState.isInCall && (
        <>
          <div className="flex-1 relative">
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local video */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Call info */}
            <div className="absolute top-4 left-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-lg font-semibold">{callState.remoteUserProfile?.displayName}</p>
                {connectionState === 'connected' ? (
                  <Wifi className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
              </div>
              <p className="text-sm text-gray-300">
                {callState.callType === 'video' ? 'Video Call' : 'Audio Call'} • {connectionState}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gray-900 flex justify-center gap-4">
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            
            {callState.callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
              </button>
            )}
            
            <button
              onClick={handleEndCall}
              className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCallWindow;