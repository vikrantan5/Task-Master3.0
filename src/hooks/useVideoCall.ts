import { useState, useEffect, useRef } from 'react';
import { socketService } from '../lib/socket';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SimplePeer from 'simple-peer';

export interface CallState {
  isInCall: boolean;
  isIncomingCall: boolean;
  caller?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  callType: 'audio' | 'video';
  callId?: string;
}

export const useVideoCall = () => {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isIncomingCall: false,
    callType: 'video'
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const { user } = useAuth();

  const initializeCall = async (receiverId: string, callType: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      setCallState(prev => ({ ...prev, isInCall: true, callType }));

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream
      });

      peerRef.current = peer;

      peer.on('signal', (signal) => {
        socketService.sendSignal(receiverId, signal);
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      socketService.initiateCall(receiverId, callType);
    } catch (error) {
      console.error('Error initializing call:', error);
    }
  };

  const acceptCall = async (callId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callState.callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      setCallState(prev => ({ ...prev, isInCall: true, isIncomingCall: false }));

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream
      });

      peerRef.current = peer;

      peer.on('signal', (signal) => {
        socketService.sendSignal(callId, signal);
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      socketService.acceptCall(callId);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const rejectCall = (callId: string) => {
    socketService.rejectCall(callId);
    setCallState({
      isInCall: false,
      isIncomingCall: false,
      callType: 'video'
    });
  };

  const endCall = async (callId?: string) => {
    if (callId) {
      socketService.endCall(callId);
    }

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }

    // Clean up peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setCallState({
      isInCall: false,
      isIncomingCall: false,
      callType: 'video'
    });

    setIsMuted(false);
    setIsVideoOff(false);

    // Log call end time
    if (callId && user) {
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (currentProfile) {
          await supabase
            .from('call_logs')
            .update({
              end_time: new Date().toISOString(),
              duration: Math.floor((Date.now() - new Date(callState.callId || '').getTime()) / 1000)
            })
            .eq('id', callId);
        }
      } catch (error) {
        console.error('Error logging call end:', error);
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    // Set up socket listeners
    socketService.onIncomingCall(async (data) => {
      const { callerId, callType, callId } = data;
      
      // Get caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', callerId)
        .single();

      if (callerProfile) {
        setCallState({
          isInCall: false,
          isIncomingCall: true,
          callType,
          callId,
          caller: {
            id: callerProfile.id,
            username: callerProfile.username,
            displayName: callerProfile.display_name,
            avatarUrl: callerProfile.avatar_url
          }
        });
      }
    });

    socketService.onCallAccepted((data) => {
      console.log('Call accepted:', data);
    });

    socketService.onCallRejected(() => {
      endCall();
    });

    socketService.onCallEnded(() => {
      endCall();
    });

    socketService.onSignal((data) => {
      if (peerRef.current) {
        peerRef.current.signal(data.signal);
      }
    });

    return () => {
      endCall();
    };
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    initializeCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};