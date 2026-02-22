import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback,
  useMemo,
  memo,
  type FormEvent
} from 'react';
import {
  database,
  getConversationsByUser,
  getMessagesByConversation,
  sendMessage,
  markMessagesAsRead,
  createConversation,
  type Message,
  type Conversation
} from '../data/database';

interface Contact {
  id: string;
  name: string;
  email: string;
  specialization?: string;
}
import { useDebounce } from '../hooks';
import { Icon, EmptyState, Modal } from './ui';
import Avatar from './ui/AvatarCustom';
import './MessagingSystem.css';

interface MessagingSystemProps {
  userId: string;
  userName: string;
  userRole: 'patient' | 'dentist';
}

// Extracted components for better performance
const ConversationItem = memo(({ 
  conversation, 
  isSelected, 
  contactName, 
  onSelect,
  formatTime
}: {
  conversation: Conversation;
  isSelected: boolean;
  contactName: string;
  onSelect: () => void;
  formatTime: (date: string) => string;
}) => (
  <div
    className={`conversation-item ${isSelected ? 'conversation-item--selected' : ''}`}
    onClick={onSelect}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onSelect()}
  >
    <Avatar name={contactName} size="md" status="online" />
    
    <div className="conversation-item__content">
      <div className="conversation-item__header">
        <span className="conversation-item__name">{contactName}</span>
        <span className="conversation-item__time">
          {formatTime(conversation.lastMessageAt)}
        </span>
      </div>
      
      <div className="conversation-item__preview">
        <span className="conversation-item__message">
          {conversation.lastMessage || 'No messages yet'}
        </span>
        
        {conversation.unreadCount > 0 && (
          <span className="conversation-item__badge">{conversation.unreadCount}</span>
        )}
      </div>
    </div>
  </div>
));

ConversationItem.displayName = 'ConversationItem';

const MessageBubble = memo(({ 
  message, 
  isOwn 
}: { 
  message: Message; 
  isOwn: boolean;
}) => (
  <div className={`message ${isOwn ? 'message--own' : 'message--other'}`}>
    <div className="message__bubble">
      <p className="message__content">{message.content}</p>
      <div className="message__meta">
        <span className="message__time">
          {new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
        {isOwn && (
          <Icon 
            name={message.read ? 'check-circle' : 'clock'} 
            size={14} 
            className={`message__status ${message.read ? 'message__status--read' : ''}`}
          />
        )}
      </div>
    </div>
  </div>
));

MessageBubble.displayName = 'MessageBubble';

const MessagingSystem = ({ userId, userName, userRole }: MessagingSystemProps) => {
  // Initialize conversations from database
  const initialConversations = useMemo(() => 
    getConversationsByUser(userId, userRole), 
    [userId, userRole]
  );
  
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    initialConversations.length > 0 ? initialConversations[0] : null
  );
  const [messages, setMessages] = useState<Message[]>(
    initialConversations.length > 0 
      ? getMessagesByConversation(initialConversations[0].id) 
      : []
  );
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 200);

  // Callback to refresh conversations list
  const refreshConversations = useCallback(() => {
    const userConversations = getConversationsByUser(userId, userRole);
    setConversations(userConversations);
    return userConversations;
  }, [userId, userRole]);

  const formatMessageTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    return isToday 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    const conversationMessages = getMessagesByConversation(conv.id);
    setMessages(conversationMessages);
    markMessagesAsRead(conv.id, userId);
    refreshConversations();
    inputRef.current?.focus();
  }, [userId, refreshConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const recipientId = userRole === 'patient' 
      ? selectedConversation.dentistId 
      : selectedConversation.patientId;
    const recipientName = userRole === 'patient'
      ? selectedConversation.dentistName
      : selectedConversation.patientName;

    const message = sendMessage(
      selectedConversation.id,
      userId,
      userName,
      userRole,
      recipientId,
      recipientName,
      newMessage.trim()
    );

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    refreshConversations();
  }, [newMessage, selectedConversation, userId, userName, userRole, refreshConversations]);

  const handleStartConversation = useCallback((otherId: string, otherName: string) => {
    const patientId = userRole === 'patient' ? userId : otherId;
    const patientName = userRole === 'patient' ? userName : otherName;
    const dentistId = userRole === 'dentist' ? userId : otherId;
    const dentistName = userRole === 'dentist' ? userName : otherName;

    const conversation = createConversation(patientId, patientName, dentistId, dentistName);
    refreshConversations();
    handleSelectConversation(conversation);
    setShowNewConversation(false);
  }, [userRole, userId, userName, refreshConversations, handleSelectConversation]);

  // Memoized derived data
  const filteredConversations = useMemo(() => 
    conversations.filter(c => {
      const name = userRole === 'patient' ? c.dentistName : c.patientName;
      return name.toLowerCase().includes(debouncedSearch.toLowerCase());
    }),
    [conversations, userRole, debouncedSearch]
  );

  const availableContacts = useMemo((): Contact[] => {
    if (userRole === 'patient') {
      return database.dentists.filter(d => d.status === 'active');
    }
    return database.patients.filter(p => p.assignedDentist === userId);
  }, [userRole, userId]);

  const selectedContactName = useMemo(() => {
    if (!selectedConversation) return '';
    return userRole === 'patient' 
      ? selectedConversation.dentistName 
      : selectedConversation.patientName;
  }, [selectedConversation, userRole]);

  return (
    <div className="messaging">
      {/* Sidebar */}
      <aside className="messaging__sidebar">
        <header className="messaging__sidebar-header">
          <div className="messaging__sidebar-title">
            <h2>Messages</h2>
            <button 
              className="btn btn--icon btn--ghost"
              onClick={() => setShowNewConversation(true)}
              aria-label="New conversation"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
          
          <div className="messaging__search">
            <Icon name="search" size={18} className="messaging__search-icon" />
            <input
              type="search"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="messaging__search-input"
            />
          </div>
        </header>

        <div className="messaging__conversations">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                contactName={userRole === 'patient' ? conv.dentistName : conv.patientName}
                onSelect={() => handleSelectConversation(conv)}
                formatTime={formatMessageTime}
              />
            ))
          ) : (
            <EmptyState
              icon="message-circle"
              title="No conversations"
              description="Start a new conversation with your care team"
              action={
                <button 
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowNewConversation(true)}
                >
                  Start Conversation
                </button>
              }
            />
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="messaging__chat">
        {selectedConversation ? (
          <>
            <header className="messaging__chat-header">
              <Avatar name={selectedContactName} size="md" status="online" />
              <div className="messaging__chat-info">
                <h3 className="messaging__chat-name">{selectedContactName}</h3>
                <span className="messaging__chat-role">
                  {userRole === 'patient' ? 'Your Dentist' : 'Patient'}
                </span>
              </div>
            </header>

            <div className="messaging__messages">
              {messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === userId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="messaging__composer" onSubmit={handleSendMessage}>
              <button type="button" className="btn btn--icon btn--ghost" aria-label="Attach file">
                <Icon name="paperclip" size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="messaging__input"
              />
              <button 
                type="submit" 
                className="btn btn--primary btn--icon"
                disabled={!newMessage.trim()}
                aria-label="Send message"
              >
                <Icon name="send" size={18} />
              </button>
            </form>
          </>
        ) : (
          <EmptyState
            icon="message-circle"
            title="Select a conversation"
            description="Choose a conversation from the sidebar to start messaging"
          />
        )}
      </main>

      {/* New Conversation Modal */}
      <Modal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        title="New Conversation"
        size="sm"
      >
        <div className="new-conversation">
          <p className="new-conversation__subtitle">
            Select a {userRole === 'patient' ? 'dentist' : 'patient'} to start a conversation
          </p>
          
          <div className="new-conversation__list">
            {availableContacts.map((contact) => (
              <button
                key={contact.id}
                className="new-conversation__contact"
                onClick={() => handleStartConversation(contact.id, contact.name)}
              >
                <Avatar name={contact.name} size="md" />
                <div className="new-conversation__contact-info">
                  <span className="new-conversation__contact-name">{contact.name}</span>
                  <span className="new-conversation__contact-meta">
                    {userRole === 'patient' ? (contact.specialization || 'Dentist') : contact.email}
                  </span>
                </div>
                <Icon name="chevron-right" size={16} />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default memo(MessagingSystem);
