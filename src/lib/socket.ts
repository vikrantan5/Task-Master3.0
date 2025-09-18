import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.userId = userId;
    this.socket = io(import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001', {
      auth: {
        userId
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Message events
  sendMessage(receiverId: string, content: string, type: string = 'text', fileUrl?: string) {
    if (this.socket) {
      this.socket.emit('send_message', {
        receiverId,
        content,
        type,
        fileUrl
      });
    }
  }

  onMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('receive_message', callback);
    }
  }

  onTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  sendTyping(receiverId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing', { receiverId, isTyping });
    }
  }

  // Video call events
  initiateCall(receiverId: string, callType: 'audio' | 'video') {
    if (this.socket) {
      this.socket.emit('initiate_call', { receiverId, callType });
    }
  }

  acceptCall(callId: string) {
    if (this.socket) {
      this.socket.emit('accept_call', { callId });
    }
  }

  rejectCall(callId: string) {
    if (this.socket) {
      this.socket.emit('reject_call', { callId });
    }
  }

  endCall(callId: string) {
    if (this.socket) {
      this.socket.emit('end_call', { callId });
    }
  }

  sendSignal(callId: string, signal: any) {
    if (this.socket) {
      this.socket.emit('signal', { callId, signal });
    }
  }

  onIncomingCall(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('incoming_call', callback);
    }
  }

  onCallAccepted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('call_accepted', callback);
    }
  }

  onCallRejected(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('call_rejected', callback);
    }
  }

  onCallEnded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('call_ended', callback);
    }
  }

  onSignal(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('signal', callback);
    }
  }

  // Presence events
  onUserOnline(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback: (userId: string) => void) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }
}

export const socketService = new SocketService();