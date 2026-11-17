import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MainLayout from '../components/MainLayout'
import { useAuth } from '../contexts/AuthContext'
import SasImage from '../components/SasImage'
import {
  encryptMessage,
  decryptMessagesBatch,
  decryptConversationsBatch,
} from '../utils/e2ee'
import './Chat.css'

const API_BASE_URL = (() => {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (configured) return configured
  return import.meta.env.DEV ? 'http://localhost:5000' : ''
})()

const Chat = () => {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [connectedFriends, setConnectedFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showDirectModal, setShowDirectModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)

  // Group form state
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [selectedFriends, setSelectedFriends] = useState([])
  const [friendSearch, setFriendSearch] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Message input state
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTabFilter, setActiveTabFilter] = useState('all') // 'all', 'direct', 'group'
  const [chatSearch, setChatSearch] = useState('')

  const messagesEndRef = useRef(null)
  const pollingRef = useRef(null)

  // Load conversations and connected friends on mount
  useEffect(() => {
    loadConversations()
    loadConnectedFriends()

    // Poll for conversation updates every 4 seconds
    pollingRef.current = setInterval(() => {
      loadConversations(false)
    }, 4000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle query param ?with=friendId or ?chat=chatId
  useEffect(() => {
    const friendIdParam = searchParams.get('with') || searchParams.get('friendId')
    const chatIdParam = searchParams.get('chat') || searchParams.get('chatId')

    if (friendIdParam && currentUser) {
      initiateDirectChatWithFriend(friendIdParam)
    } else if (chatIdParam && conversations.length > 0) {
      const found = conversations.find((c) => c._id === chatIdParam)
      if (found) selectChat(found)
    }
  }, [searchParams, conversations.length, currentUser])

  // Poll messages for active chat every 3 seconds
  useEffect(() => {
    if (!activeChat) return

    loadMessages(activeChat._id, false)
    const msgInterval = setInterval(() => {
      loadMessages(activeChat._id, false)
    }, 3000)

    return () => clearInterval(msgInterval)
  }, [activeChat?._id])

  const loadConversations = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingChats(true)
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rawChats = response.data || []
      const decryptedChats = await decryptConversationsBatch(rawChats)
      setConversations(decryptedChats)

      // If activeChat is open, update activeChat reference
      if (activeChat) {
        const updated = decryptedChats.find((c) => c._id === activeChat._id)
        if (updated) setActiveChat(updated)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      if (showLoading) setLoadingChats(false)
    }
  }

  const loadConnectedFriends = async () => {
    try {
      setLoadingFriends(true)
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/chat/connected-friends`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConnectedFriends(response.data || [])
    } catch (error) {
      console.error('Failed to load connected friends:', error)
    } finally {
      setLoadingFriends(false)
    }
  }

  const loadMessages = async (chatId, showLoading = true) => {
    try {
      if (showLoading) setLoadingMessages(true)
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rawMessages = response.data || []
      const decryptedMessages = await decryptMessagesBatch(rawMessages, chatId)
      setMessages(decryptedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      if (showLoading) setLoadingMessages(false)
    }
  }

  const selectChat = (chat) => {
    setActiveChat(chat)
    setSearchParams({ chat: chat._id })
    loadMessages(chat._id, true)
  }

  const initiateDirectChatWithFriend = async (friendId) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await axios.post(
        `${API_BASE_URL}/api/chat/direct`,
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const chat = response.data
      await loadConversations(false)
      selectChat(chat)
      setShowDirectModal(false)
    } catch (error) {
      console.error('Failed to start chat with friend:', error)
      alert(error.response?.data?.message || 'Could not start chat. Make sure you are connected friends.')
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) {
      alert('Please enter a group name')
      return
    }
    if (selectedFriends.length === 0) {
      alert('Please select at least one connected friend to add to the group')
      return
    }

    try {
      setCreatingGroup(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/group`,
        {
          name: groupName.trim(),
          description: groupDesc.trim(),
          memberIds: selectedFriends,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const newGroup = response.data
      setShowGroupModal(false)
      setGroupName('')
      setGroupDesc('')
      setSelectedFriends([])
      await loadConversations(false)
      selectChat(newGroup)
    } catch (error) {
      console.error('Failed to create group:', error)
      alert(error.response?.data?.message || 'Failed to create group. Only connected friends can be added.')
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!messageText.trim() || !activeChat || sendingMessage) return

    const textToSend = messageText.trim()
    setMessageText('')

    try {
      setSendingMessage(true)
      const token = localStorage.getItem('auth_token')

      // Encrypt message text on client side using AES-256-GCM before transmission
      const encryptedPayload = await encryptMessage(textToSend, activeChat._id)

      const response = await axios.post(
        `${API_BASE_URL}/api/chat/${activeChat._id}/messages`,
        { text: encryptedPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Keep decrypted plaintext for sender UI representation
      const sentMessage = {
        ...response.data,
        text: textToSend,
        isEncrypted: true,
      }

      setMessages((prev) => [...prev, sentMessage])
      loadConversations(false)
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
      setMessageText(textToSend)
    } finally {
      setSendingMessage(false)
    }
  }

  const toggleSelectFriend = (friendId) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    )
  }

  const getChatDisplayName = (chat) => {
    if (!chat) return ''
    if (chat.type === 'group') return chat.name || 'Group Chat'

    // Direct chat: show other participant's name
    const other = chat.participants?.find((p) => p._id !== currentUser?._id)
    return other?.name || 'Alumni Friend'
  }

  const getChatAvatar = (chat) => {
    if (!chat) return null
    if (chat.type === 'group') {
      return (
        <div className="chat-avatar-group">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      )
    }
    const other = chat.participants?.find((p) => p._id !== currentUser?._id)
    if (other?.profileImage) {
      const src = other.profileImage.startsWith('http')
        ? other.profileImage
        : `${API_BASE_URL}${other.profileImage.startsWith('/') ? other.profileImage : '/' + other.profileImage}`
      return <SasImage src={src} alt={other.name} className="chat-avatar-img" />
    }
    return (
      <div className="chat-avatar-initial">
        {other?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }

  const getOtherParticipant = (chat) => {
    if (!chat || chat.type === 'group') return null
    return chat.participants?.find((p) => p._id !== currentUser?._id)
  }

  const filteredConversations = conversations.filter((c) => {
    if (activeTabFilter === 'direct' && c.type !== 'direct') return false
    if (activeTabFilter === 'group' && c.type !== 'group') return false

    if (chatSearch.trim()) {
      const term = chatSearch.toLowerCase()
      const name = getChatDisplayName(c).toLowerCase()
      return name.includes(term)
    }
    return true
  })

  const filteredConnectedFriends = connectedFriends.filter((f) => {
    if (!friendSearch.trim()) return true
    const term = friendSearch.toLowerCase()
    return (
      f.name?.toLowerCase().includes(term) ||
      f.headline?.toLowerCase().includes(term) ||
      f.institution?.toLowerCase().includes(term)
    )
  })

  return (
    <MainLayout fullWidth={true}>
      <div className="chat-page-container">
        <div className="chat-layout-card">
          {/* LEFT PANEL: CONVERSATION LIST */}
          <div className={`chat-sidebar ${activeChat ? 'has-active-chat' : ''}`}>
            <div className="chat-sidebar-header">
              <div className="chat-header-title-row">
                <h2>Messages</h2>
                <div className="chat-header-actions">
                  <button
                    className="chat-action-btn"
                    onClick={() => setShowDirectModal(true)}
                    title="Start Chat with Connected Friend"
                  >
                    <span>New Chat</span>
                  </button>
                  <button
                    className="chat-action-btn primary"
                    onClick={() => {
                      loadConnectedFriends()
                      setShowGroupModal(true)
                    }}
                    title="Create Group with Connected Friends"
                  >
                    <span>+ New Group</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="chat-search-wrap">
                <span className="search-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search chats & groups..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="chat-search-input"
                />
                {chatSearch && (
                  <button className="search-clear-btn" onClick={() => setChatSearch('')}>
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="chat-filter-tabs">
                <button
                  className={`chat-tab-pill ${activeTabFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTabFilter('all')}
                >
                  All ({conversations.length})
                </button>
                <button
                  className={`chat-tab-pill ${activeTabFilter === 'direct' ? 'active' : ''}`}
                  onClick={() => setActiveTabFilter('direct')}
                >
                  Direct ({conversations.filter((c) => c.type === 'direct').length})
                </button>
                <button
                  className={`chat-tab-pill ${activeTabFilter === 'group' ? 'active' : ''}`}
                  onClick={() => setActiveTabFilter('group')}
                >
                  Groups ({conversations.filter((c) => c.type === 'group').length})
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="chat-conversations-list">
              {loadingChats ? (
                <div className="chat-loading-state">
                  <div className="spinner"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="chat-empty-list">
                  <div className="empty-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3>No conversations yet</h3>
                  <p>Start a 1-on-1 chat or create a group with your connected friends.</p>
                  <div className="empty-btns">
                    <button
                      className="chat-modal-btn primary"
                      onClick={() => setShowDirectModal(true)}
                    >
                      Start a Chat
                    </button>
                    <button
                      className="chat-modal-btn secondary"
                      onClick={() => setShowGroupModal(true)}
                    >
                      Create Group
                    </button>
                  </div>
                </div>
              ) : (
                filteredConversations.map((chat) => {
                  const isSelected = activeChat?._id === chat._id
                  const displayName = getChatDisplayName(chat)
                  const isGroup = chat.type === 'group'
                  const other = getOtherParticipant(chat)
                  const lastMsg = chat.lastMessage
                  const time = chat.lastMessageAt
                    ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''

                  return (
                    <div
                      key={chat._id}
                      className={`chat-conv-item ${isSelected ? 'active' : ''}`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="conv-avatar-col">{getChatAvatar(chat)}</div>
                      <div className="conv-details-col">
                        <div className="conv-top-row">
                          <span className="conv-name">
                            {isGroup && <span className="group-badge">Group</span>}
                            {displayName}
                          </span>
                          <span className="conv-time">{time}</span>
                        </div>
                        <div className="conv-bottom-row">
                          <p className="conv-last-msg">
                            {lastMsg ? (
                              <>
                                {isGroup && lastMsg.sender && (
                                  <strong>
                                    {lastMsg.sender._id === currentUser?._id
                                      ? 'You: '
                                      : `${lastMsg.sender.name?.split(' ')[0]}: `}
                                  </strong>
                                )}
                                {lastMsg.text}
                              </>
                            ) : (
                              <span className="empty-preview">
                                {isGroup ? 'Group created' : 'Connected friend'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: ACTIVE CHAT PANE */}
          <div className={`chat-main-pane ${!activeChat ? 'empty-pane' : ''}`}>
            {activeChat ? (
              <div className="active-chat-wrapper">
                {/* Chat Header */}
                <div className="active-chat-header">
                  <button
                    className="chat-back-btn"
                    onClick={() => setActiveChat(null)}
                    title="Back to list"
                  >
                    ←
                  </button>

                  <div className="active-chat-header-info">
                    <div className="active-avatar-wrap">{getChatAvatar(activeChat)}</div>
                    <div className="active-title-wrap">
                      <div className="active-title-row">
                        <h3>{getChatDisplayName(activeChat)}</h3>
                        {activeChat.type === 'group' && (
                          <span className="group-tag-pill">
                            {activeChat.participants?.length || 0} members
                          </span>
                        )}
                        <span className="e2ee-header-badge" title="End-to-End Encrypted (AES-256-GCM)">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span>End-to-End Encrypted</span>
                        </span>
                      </div>
                      <p className="active-sub-info">
                        {activeChat.type === 'group' ? (
                          <span
                            className="clickable-sub"
                            onClick={() => setShowMembersModal(true)}
                          >
                            Click to view connected group members
                          </span>
                        ) : (
                          getOtherParticipant(activeChat)?.headline || 'Connected Alumni Friend'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="active-chat-header-actions">
                    {activeChat.type === 'group' ? (
                      <button
                        className="header-icon-btn"
                        onClick={() => setShowMembersModal(true)}
                        title="Group Members"
                      >
                        Members
                      </button>
                    ) : (
                      <button
                        className="header-icon-btn"
                        onClick={() => {
                          const other = getOtherParticipant(activeChat)
                          if (other) navigate(`/user/${other._id}`)
                        }}
                        title="View Profile"
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="active-chat-messages">
                  {/* Security Notice Banner */}
                  <div className="e2ee-security-banner">
                    <div className="e2ee-lock-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <span>
                      Messages are end-to-end encrypted. No one outside of this chat, not even Alva's Portal or the server, can read them.
                    </span>
                  </div>

                  {loadingMessages ? (
                    <div className="chat-loading-state">
                      <div className="spinner"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-messages-empty">
                      <div className="bubble-icon">👋</div>
                      <h3>Say hello!</h3>
                      <p>
                        {activeChat.type === 'group'
                          ? `Start the conversation in ${activeChat.name}!`
                          : `Send your first message to ${getChatDisplayName(activeChat)}.`}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.sender?._id === currentUser?._id
                      const showSender =
                        activeChat.type === 'group' &&
                        !isMe &&
                        (idx === 0 || messages[idx - 1]?.sender?._id !== msg.sender?._id)

                      const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <div
                          key={msg._id || idx}
                          className={`chat-bubble-row ${isMe ? 'my-message' : 'other-message'}`}
                        >
                          {!isMe && (
                            <div className="bubble-sender-avatar">
                              {msg.sender?.profileImage ? (
                                <SasImage
                                  src={
                                    msg.sender.profileImage.startsWith('http')
                                      ? msg.sender.profileImage
                                      : `${API_BASE_URL}${msg.sender.profileImage.startsWith('/') ? msg.sender.profileImage : '/' + msg.sender.profileImage}`
                                  }
                                  alt={msg.sender.name}
                                />
                              ) : (
                                <span>{msg.sender?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                              )}
                            </div>
                          )}

                          <div className="bubble-content-wrap">
                            {showSender && (
                              <span className="bubble-sender-name">
                                {msg.sender?.name || 'Alumni Friend'}
                              </span>
                            )}
                            <div className="chat-bubble">
                              <p className="bubble-text">{msg.text}</p>
                              <div className="bubble-meta">
                                <span className="bubble-time">{timeString}</span>
                                {isMe && <span className="bubble-check">✓</span>}
                                <span className="bubble-e2ee-lock" title="End-to-end encrypted">🔒</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form className="active-chat-input-bar" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder={`Message ${getChatDisplayName(activeChat)} (End-to-End Encrypted)...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="chat-text-input"
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!messageText.trim() || sendingMessage}
                  >
                    <span>Send</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="no-chat-selected">
                <div className="no-chat-illustration">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2>Connect & Chat with Friends</h2>
                <p>
                  Select an existing conversation from the list or start a new direct chat / group
                  with your connected alumni friends.
                </p>
                <div className="no-chat-buttons">
                  <button
                    className="chat-modal-btn primary"
                    onClick={() => setShowDirectModal(true)}
                  >
                    New Direct Chat
                  </button>
                  <button
                    className="chat-modal-btn secondary"
                    onClick={() => {
                      loadConnectedFriends()
                      setShowGroupModal(true)
                    }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL: CREATE GROUP (ONLY WITH CONNECTED FRIENDS) */}
        {showGroupModal && (
          <div className="chat-modal-backdrop" onClick={() => setShowGroupModal(false)}>
            <div className="chat-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="chat-modal-header">
                <div>
                  <h3>Create New Group</h3>
                  <p className="modal-sub">
                    You can create groups <strong>only with your connected friends</strong>.
                  </p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowGroupModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="chat-modal-form">
                <div className="form-group">
                  <label>Group Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. AI & Robotics Batch '24"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description or purpose of this group..."
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <div className="friends-select-header">
                    <label>
                      Select Connected Friends ({selectedFriends.length} selected) *
                    </label>
                    <span className="friends-policy-badge">
                      Connected Friends Only
                    </span>
                  </div>

                  <div className="friend-search-wrap">
                    <input
                      type="text"
                      placeholder="Search connected friends..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="modal-search-input"
                    />
                  </div>

                  <div className="friends-selection-list">
                    {loadingFriends ? (
                      <div className="friends-loading">Loading your friends...</div>
                    ) : filteredConnectedFriends.length === 0 ? (
                      <div className="friends-empty-picker">
                        <p>No connected friends found.</p>
                        <small>Connect with alumni in "My Network" first to invite them to groups!</small>
                      </div>
                    ) : (
                      filteredConnectedFriends.map((friend) => {
                        const isSelected = selectedFriends.includes(friend._id)
                        return (
                          <div
                            key={friend._id}
                            className={`friend-select-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSelectFriend(friend._id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by container onClick
                              className="friend-checkbox"
                            />
                            <div className="friend-item-avatar">
                              {friend.profileImage ? (
                                <SasImage
                                  src={
                                    friend.profileImage.startsWith('http')
                                      ? friend.profileImage
                                      : `${API_BASE_URL}${friend.profileImage.startsWith('/') ? friend.profileImage : '/' + friend.profileImage}`
                                  }
                                  alt={friend.name}
                                />
                              ) : (
                                <span>{friend.name?.charAt(0)?.toUpperCase() || '👤'}</span>
                              )}
                            </div>
                            <div className="friend-item-info">
                              <span className="friend-name">{friend.name}</span>
                              <span className="friend-headline">
                                {friend.headline || friend.institution || 'Alumni Friend'}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="chat-modal-footer">
                  <button
                    type="button"
                    className="chat-modal-btn secondary"
                    onClick={() => setShowGroupModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="chat-modal-btn primary"
                    disabled={!groupName.trim() || selectedFriends.length === 0 || creatingGroup}
                  >
                    {creatingGroup ? 'Creating Group...' : `Create Group (${selectedFriends.length})`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DIRECT CHAT WITH CONNECTED FRIEND */}
        {showDirectModal && (
          <div className="chat-modal-backdrop" onClick={() => setShowDirectModal(false)}>
            <div className="chat-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="chat-modal-header">
                <div>
                  <h3>Start Direct Chat</h3>
                  <p className="modal-sub">
                    Select a connected friend to start messaging directly.
                  </p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowDirectModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="chat-modal-body">
                <div className="friend-search-wrap">
                  <input
                    type="text"
                    placeholder="Search connected friends..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="modal-search-input"
                  />
                </div>

                <div className="friends-selection-list direct-list">
                  {loadingFriends ? (
                    <div className="friends-loading">Loading your friends...</div>
                  ) : filteredConnectedFriends.length === 0 ? (
                    <div className="friends-empty-picker">
                      <p>No connected friends found.</p>
                      <button
                        className="chat-modal-btn secondary"
                        onClick={() => navigate('/alumni')}
                      >
                        Explore Alumni Network
                      </button>
                    </div>
                  ) : (
                    filteredConnectedFriends.map((friend) => (
                      <div
                        key={friend._id}
                        className="friend-direct-row"
                        onClick={() => initiateDirectChatWithFriend(friend._id)}
                      >
                        <div className="friend-item-avatar">
                          {friend.profileImage ? (
                            <SasImage
                              src={
                                friend.profileImage.startsWith('http')
                                  ? friend.profileImage
                                  : `${API_BASE_URL}${friend.profileImage.startsWith('/') ? friend.profileImage : '/' + friend.profileImage}`
                              }
                              alt={friend.name}
                            />
                          ) : (
                            <span>{friend.name?.charAt(0)?.toUpperCase() || '👤'}</span>
                          )}
                        </div>
                        <div className="friend-item-info">
                          <span className="friend-name">{friend.name}</span>
                          <span className="friend-headline">
                            {friend.headline || friend.institution || 'Connected Friend'}
                          </span>
                        </div>
                        <button className="direct-chat-btn">
                          Message
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: VIEW GROUP MEMBERS */}
        {showMembersModal && activeChat && activeChat.type === 'group' && (
          <div className="chat-modal-backdrop" onClick={() => setShowMembersModal(false)}>
            <div className="chat-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="chat-modal-header">
                <div>
                  <h3>{activeChat.name}</h3>
                  <p className="modal-sub">
                    {activeChat.description || 'Group Members (Connected Friends)'}
                  </p>
                </div>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowMembersModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="chat-modal-body">
                <div className="members-list">
                  {activeChat.participants?.map((member) => {
                    const isAdmin = activeChat.admin?._id === member._id || activeChat.admin === member._id
                    const isMe = member._id === currentUser?._id
                    return (
                      <div key={member._id} className="member-row">
                        <div className="friend-item-avatar">
                          {member.profileImage ? (
                            <SasImage
                              src={
                                member.profileImage.startsWith('http')
                                  ? member.profileImage
                                  : `${API_BASE_URL}${member.profileImage.startsWith('/') ? member.profileImage : '/' + member.profileImage}`
                              }
                              alt={member.name}
                            />
                          ) : (
                            <span>{member.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                          )}
                        </div>
                        <div className="friend-item-info">
                          <span className="friend-name">
                            {member.name} {isMe && '(You)'}
                          </span>
                          <span className="friend-headline">
                            {member.headline || member.institution || 'Alumni Member'}
                          </span>
                        </div>
                        {isAdmin && <span className="admin-tag-badge">Admin</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Chat
