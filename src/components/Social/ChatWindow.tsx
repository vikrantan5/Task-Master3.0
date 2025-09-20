import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image, FileText, X, Phone, Video, Smile } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useProfile } from '../../hooks/useProfile';

interface ChatWindowProps {
  chatUserId: string;
  onClose: () => void;
  onStartCall: (profileId: string, callType: 'audio' | 'video') => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatUserId, onClose, onStartCall }) => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, loading, typing, sendMessage, sendTypingIndicator } = useMessages(chatUserId);
  const { profile: currentProfile } = useProfile();

  // Get chat partner profile
  const [chatPartner, setChatPartner] = useState<any>(null);

  useEffect(() => {
    const fetchChatPartner = async () => {
      const { searchUsers } = await import('../../hooks/useProfile');
      // This is a simplified approach - in a real app, you'd have a better way to get profile by ID
    };
    fetchChatPartner();
  }, [chatUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage(messageText.trim());
      setMessageText('');
      sendTypingIndicator(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);
  };

  const handleFileUpload = async (file: File, type: 'image' | 'document') => {
    try {
      await sendMessage(file.name, type, file);
      setShowFileMenu(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderMessage = (message: any) => {
    const isOwn = message.senderId === currentProfile?.id;
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          {message.type === 'text' && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          
          {message.type === 'image' && (
            <div>
              <img 
                src={message.fileUrl} 
                alt="Shared image" 
                className="rounded-lg max-w-full h-auto mb-2"
              />
              {message.content && <p className="text-sm">{message.content}</p>}
            </div>
          )}
          
          {message.type === 'document' && (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <div>
                <a 
                  href={message.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {message.content}
                </a>
              </div>
            </div>
          )}
          
          <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.createdAt)}
            {isOwn && message.isRead && <span className="ml-1">✓✓</span>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                U
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Chat User</h3>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartCall(chatUserId, 'audio')}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              onClick={() => onStartCall(chatUserId, 'video')}
              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end gap-2">
            <div className="relative">
              <button
                onClick={() => setShowFileMenu(!showFileMenu)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              {showFileMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px]">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="flex items-center gap-2 w-full p-2 text-left hover:bg-gray-100 rounded text-sm"
                  >
                    <Image className="w-4 h-4" />
                    Image
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="flex items-center gap-2 w-full p-2 text-left hover:bg-gray-100 rounded text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Document
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <textarea
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const type = file.type.startsWith('image/') ? 'image' : 'document';
              handleFileUpload(file, type);
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatWindow;