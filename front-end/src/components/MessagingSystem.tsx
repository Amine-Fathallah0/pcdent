import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  type FormEvent,
} from 'react';
import {
  fetchConversations,
  fetchConversationMessages,
  sendConversationMessage,
  markConversationRead,
  type ConversationDto,
  type MessageDto,
} from '../lib/backendApi';
import { useDebounce, useChatSocket, type ChatSocketEvent } from '../hooks';
import { Icon, EmptyState } from './ui';
import Avatar from './ui/AvatarCustom';
import './MessagingSystem.css';

interface MessagingSystemProps {
  userId: string;
  userName: string;
  userRole: 'patient' | 'dentist';
}

const ConversationItem = memo(({
  conversation,
  isSelected,
  onSelect,
  formatTime,
}: {
  conversation: ConversationDto;
  isSelected: boolean;
  onSelect: () => void;
  formatTime: (date: string | null) => string;
}) => (
  <div
    className={`conversation-item ${isSelected ? 'conversation-item--selected' : ''}`}
    onClick={onSelect}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onSelect()}
  >
    <Avatar name={conversation.other_user_name} size="md" status="online" />
    <div className="conversation-item__content">
      <div className="conversation-item__header">
        <span className="conversation-item__name">{conversation.other_user_name}</span>
        <span className="conversation-item__time">{formatTime(conversation.last_message_at)}</span>
      </div>
      <div className="conversation-item__preview">
        <span className="conversation-item__message">
          {conversation.last_message || 'No messages yet'}
        </span>
        {conversation.unread_count > 0 && (
          <span className="conversation-item__badge">{conversation.unread_count}</span>
        )}
      </div>
    </div>
  </div>
));
ConversationItem.displayName = 'ConversationItem';

const MessageBubble = memo(({ message, isOwn }: { message: MessageDto; isOwn: boolean }) => {
  if (message.is_system) {
    return (
      <div className="message message--system">
        <div className="message__system-bubble">
          <p className="message__content">{message.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`message ${isOwn ? 'message--own' : 'message--other'}`}>
      <div className="message__bubble">
        <p className="message__content">{message.content}</p>
        <div className="message__meta">
          <span className="message__time">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <Icon
              name={message.is_read ? 'check-circle' : 'clock'}
              size={14}
              className={`message__status ${message.is_read ? 'message__status--read' : ''}`}
            />
          )}
        </div>
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const MessagingSystem = ({ userId, userRole }: MessagingSystemProps) => {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

  const debouncedSearch = useDebounce(searchTerm, 200);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      return data;
    } catch {
      setError('Failed to load conversations.');
      return [] as ConversationDto[];
    }
  }, []);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setLoadingConvs(true);
    fetchConversations()
      .then((data) => {
        if (cancelled) return;
        setConversations(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load conversations.');
      })
      .finally(() => {
        if (!cancelled) setLoadingConvs(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load messages when selection changes.
  useEffect(() => {
    if (selectedId === null) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMsgs(true);
    fetchConversationMessages(selectedId)
      .then((data) => {
        if (cancelled) return;
        setMessages(data);
        // The GET endpoint marks messages read server-side; refresh badges.
        refreshConversations();
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load messages.');
      })
      .finally(() => {
        if (!cancelled) setLoadingMsgs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshConversations]);

  // WebSocket — push new messages and read receipts.
  const handleSocketEvent = useCallback((event: ChatSocketEvent) => {
    if (event.type === 'message.new') {
      const isForOpenConversation = selectedIdRef.current === event.conversation_id;
      const isFromOther = event.message.sender_id !== userId && !event.message.is_system;

      if (isForOpenConversation) {
        // Mark as already-read locally so the bubble doesn't flicker as unread.
        const incoming = isFromOther ? { ...event.message, is_read: true } : event.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        // Tell the backend we've read it; it will broadcast chat.read to the sender.
        if (isFromOther) {
          markConversationRead(event.conversation_id).catch(() => {});
        }
      }

      // Update conversation list (last message + unread count).
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === event.conversation_id);
        if (idx === -1) {
          refreshConversations();
          return prev;
        }
        const target = prev[idx];
        const incrementUnread = !isForOpenConversation && isFromOther;
        const updated: ConversationDto = {
          ...target,
          last_message: event.message.content,
          last_message_at: event.message.created_at,
          unread_count: incrementUnread ? target.unread_count + 1 : target.unread_count,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    } else if (event.type === 'conversation.read') {
      // The other person read our messages — flip our outgoing bubbles to "read".
      if (selectedIdRef.current === event.conversation_id) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === userId ? { ...m, is_read: true } : m)),
        );
      }
    }
  }, [refreshConversations, userId]);

  useChatSocket({ enabled: true, onEvent: handleSocketEvent });

  const formatMessageTime = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const handleSelectConversation = useCallback((id: number) => {
    setSelectedId(id);
    inputRef.current?.focus();
  }, []);

  // Auto-focus input whenever the selected conversation changes.
  useEffect(() => {
    if (selectedId !== null) {
      inputRef.current?.focus();
    }
  }, [selectedId]);

  // Auto-scroll on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const content = newMessage.trim();
      if (!content || selectedId === null || sending) return;

      setSending(true);
      try {
        const created = await sendConversationMessage(selectedId, content);
        // The WebSocket will also push this back; dedupe by id in the message handler.
        setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
        setNewMessage('');
        setTimeout(() => inputRef.current?.focus(), 0);
        // Promote this conversation to the top of the list.
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === selectedId);
          if (idx === -1) return prev;
          const target = prev[idx];
          const updated: ConversationDto = {
            ...target,
            last_message: created.content,
            last_message_at: created.created_at,
          };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        });
      } catch {
        setError('Failed to send message.');
      } finally {
        setSending(false);
      }
    },
    [newMessage, selectedId, sending],
  );

  const filteredConversations = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => {
      const name = (c.other_user_name ?? '').toLowerCase();
      const lastMsg = (c.last_message ?? '').toLowerCase();
      return name.includes(term) || lastMsg.includes(term);
    });
  }, [conversations, debouncedSearch]);

  const isSearching = debouncedSearch.trim().length > 0;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return (
    <div className="messaging">
      <aside className="messaging__sidebar">
        <header className="messaging__sidebar-header">
          <div className="messaging__sidebar-title">
            <span className="messaging__sidebar-heading">All Messages</span>
            <button
              className="btn btn--icon btn--ghost"
              onClick={() => { setSearchOpen(o => !o); setSearchTerm(''); }}
              aria-label="Toggle search"
            >
              <Icon name={searchOpen ? 'x' : 'search'} size={18} />
            </button>
          </div>
          {searchOpen && (
            <div className="messaging__search">
              <Icon name="search" size={16} className="messaging__search-icon" />
              <input
                autoFocus
                type="search"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="messaging__search-input"
              />
            </div>
          )}
        </header>

        <div className="messaging__conversations">
          {loadingConvs ? (
            <div style={{ padding: 'var(--space-16)' }}>Loading…</div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedId === conv.id}
                onSelect={() => handleSelectConversation(conv.id)}
                formatTime={formatMessageTime}
              />
            ))
          ) : isSearching ? (
            <EmptyState
              icon="search"
              title="No matches"
              description={`Nothing found for "${debouncedSearch.trim()}".`}
            />
          ) : (
            <EmptyState
              icon="message-circle"
              title="No conversations"
              description={
                userRole === 'patient'
                  ? 'Connect with a dentist to start chatting.'
                  : 'Approve a patient request to start chatting.'
              }
            />
          )}
        </div>
      </aside>

      <main className="messaging__chat">
        {selectedConversation ? (
          <>
            <header className="messaging__chat-header">
              <Avatar name={selectedConversation.other_user_name} size="md" status="online" />
              <div className="messaging__chat-info">
                <h3 className="messaging__chat-name">{selectedConversation.other_user_name}</h3>
                <span className="messaging__chat-role">
                  {selectedConversation.other_user_role === 'dentist' ? 'Your Dentist' : 'Patient'}
                </span>
              </div>
            </header>

            <div className="messaging__messages">
              {loadingMsgs ? (
                <div style={{ padding: 'var(--space-16)' }}>Loading messages…</div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === userId}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="messaging__composer" onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="messaging__input"
                disabled={sending}
              />
              <button
                type="submit"
                className="btn btn--primary btn--icon"
                disabled={!newMessage.trim() || sending}
                aria-label="Send message"
                tabIndex={-1}
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

      {error && (
        <div className="messaging__error" role="alert" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}
    </div>
  );
};

export default memo(MessagingSystem);
