import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CallState {
  isInCall: boolean;
  isIncomingCall: boolean;
  isOutgoingCall: boolean;
  callType: 'audio' | 'video';
  callId?: string;
  remoteUserId?: string;
  remoteUserProfile?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export const useWebRTC = () => {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isIncomingCall: false,
    isOutgoingCall: false,
    callType: 'video'
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers });
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            callId: callState.callId,
            fromUserId: user?.id
          }
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, [callState.callId, user?.id]);

  const initializeCall = async (receiverProfileId: string, callType: 'audio' | 'video') => {
    try {
      // Get receiver profile
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', receiverProfileId)
        .single();

      if (!receiverProfile) throw new Error('Receiver profile not found');

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      setCallState({
        isInCall: false,
        isIncomingCall: false,
        isOutgoingCall: true,
        callType,
        remoteUserId: receiverProfile.user_id,
        remoteUserProfile: {
          id: receiverProfile.id,
          username: receiverProfile.username,
          displayName: receiverProfile.display_name,
          avatarUrl: receiverProfile.avatar_url
        }
      });

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Generate call ID
      const callId = crypto.randomUUID();
      
      // Send call initiation through Supabase channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call-offer',
          payload: {
            callId,
            offer,
            callType,
            fromUserId: user?.id,
            toUserId: receiverProfile.user_id
          }
        });
      }

      setCallState(prev => ({ ...prev, callId }));

      // Log call start
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (currentProfile) {
        await supabase
          .from('call_logs')
          .insert({
            id: callId,
            caller_id: currentProfile.id,
            receiver_id: receiverProfileId,
            call_type: callType,
            start_time: new Date().toISOString()
          });
      }

    } catch (error) {
      console.error('Error initializing call:', error);
      endCall();
    }
  };

  const acceptCall = async (callId: string, offer: RTCSessionDescriptionInit, callerUserId: string, callType: 'audio' | 'video') => {
    try {
      // Get caller profile
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', callerUserId)
        .single();

      if (!callerProfile) throw new Error('Caller profile not found');

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      setCallState({
        isInCall: true,
        isIncomingCall: false,
        isOutgoingCall: false,
        callType,
        callId,
        remoteUserId: callerUserId,
        remoteUserProfile: {
          id: callerProfile.id,
          username: callerProfile.username,
          displayName: callerProfile.display_name,
          avatarUrl: callerProfile.avatar_url
        }
      });

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description and create answer
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'call-answer',
          payload: {
            callId,
            answer,
            fromUserId: user?.id,
            toUserId: callerUserId
          }
        });
      }

    } catch (error) {
      console.error('Error accepting call:', error);
      rejectCall(callId, callerUserId);
    }
  };

  const rejectCall = (callId: string, callerUserId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-rejected',
        payload: {
          callId,
          fromUserId: user?.id,
          toUserId: callerUserId
        }
      });
    }

    setCallState({
      isInCall: false,
      isIncomingCall: false,
      isOutgoingCall: false,
      callType: 'video'
    });
  };

  const endCall = async () => {
    // Send end call signal
    if (channelRef.current && callState.callId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {
          callId: callState.callId,
          fromUserId: user?.id,
          toUserId: callState.remoteUserId
        }
      });
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
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Update call log
    if (callState.callId && user) {
      try {
        await supabase
          .from('call_logs')
          .update({
            end_time: new Date().toISOString()
          })
          .eq('id', callState.callId);
      } catch (error) {
        console.error('Error updating call log:', error);
      }
    }

    setCallState({
      isInCall: false,
      isIncomingCall: false,
      isOutgoingCall: false,
      callType: 'video'
    });

    setIsMuted(false);
    setIsVideoOff(false);
    setConnectionState('new');
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
    if (user) {
      // Create WebRTC signaling channel
      channelRef.current = supabase
        .channel(`webrtc:${user.id}`)
        .on('broadcast', { event: 'call-offer' }, async (payload) => {
          const { callId, offer, callType, fromUserId, toUserId } = payload.payload;
          
          if (toUserId === user.id && !callState.isInCall) {
            // Get caller profile
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', fromUserId)
              .single();

            if (callerProfile) {
              setCallState({
                isInCall: false,
                isIncomingCall: true,
                isOutgoingCall: false,
                callType,
                callId,
                remoteUserId: fromUserId,
                remoteUserProfile: {
                  id: callerProfile.id,
                  username: callerProfile.username,
                  displayName: callerProfile.display_name,
                  avatarUrl: callerProfile.avatar_url
                }
              });

              // Store offer for when user accepts
              if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
              }
              peerConnectionRef.current = createPeerConnection();
              await peerConnectionRef.current.setRemoteDescription(offer);
            }
          }
        })
        .on('broadcast', { event: 'call-answer' }, async (payload) => {
          const { answer, fromUserId, toUserId } = payload.payload;
          
          if (toUserId === user.id && peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(answer);
            setCallState(prev => ({ ...prev, isInCall: true, isOutgoingCall: false }));
          }
        })
        .on('broadcast', { event: 'call-rejected' }, (payload) => {
          const { toUserId } = payload.payload;
          
          if (toUserId === user.id) {
            endCall();
          }
        })
        .on('broadcast', { event: 'call-ended' }, (payload) => {
          const { toUserId } = payload.payload;
          
          if (toUserId === user.id) {
            endCall();
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
          const { candidate, fromUserId, toUserId } = payload.payload;
          
          if (toUserId === user.id && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(candidate);
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
        })
        .subscribe();

      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        endCall();
      };
    }
  }, [user, createPeerConnection]);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    connectionState,
    initializeCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};