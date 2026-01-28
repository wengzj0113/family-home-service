<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>{{ contactName || '聊天' }}</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="chat-content" ref="chatBox">
      <div v-if="loading" class="center-msg">加载记录...</div>
      <div v-else class="message-list">
        <div 
          v-for="m in messages" 
          :key="m.id" 
          :class="['message-item', m.senderId === currentUser.id ? 'sent' : 'received']"
        >
          <div class="avatar" v-if="m.senderId !== currentUser.id">
            <img :src="m.sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender?.phone}`">
          </div>
          <div class="msg-bubble">
            {{ m.content }}
            <span class="time">{{ formatTime(m.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <input 
        type="text" 
        v-model="inputMsg" 
        placeholder="输入消息..." 
        @keyup.enter="handleSend"
      >
      <button class="send-btn" @click="handleSend" :disabled="!inputMsg.trim()">
        <i class="ri-send-plane-fill"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import api from '../api'

const route = useRoute()
const contactId = Number(route.params.contactId)
const contactName = ref(route.query.name || '')
const messages = ref([])
const inputMsg = ref('')
const loading = ref(false)
const chatBox = ref(null)
const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))

let socket = null

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBox.value) {
      chatBox.value.scrollTop = chatBox.value.scrollHeight
    }
  })
}

const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await api.get(`/chat/history/${contactId}`)
    messages.value = res.data
    scrollToBottom()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSend = () => {
  if (!inputMsg.value.trim()) return
  
  const msgData = {
    receiverId: contactId,
    content: inputMsg.value,
    orderId: route.query.orderId ? Number(route.query.orderId) : null
  }

  socket.emit('sendMessage', msgData)
  inputMsg.value = ''
}

const formatTime = (t) => {
  const date = new Date(t)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchHistory()

  const token = localStorage.getItem('token')
  socket = io('http://localhost:3000', {
    query: { 
      token,
      userId: currentUser.value.id
    }
  })

  socket.on('newMessage', (msg) => {
    if (msg.senderId === contactId) {
      messages.value.push(msg)
      scrollToBottom()
    }
  })

  socket.on('messageSent', (msg) => {
    messages.value.push(msg)
    scrollToBottom()
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }

.chat-content { flex: 1; overflow-y: auto; padding: 20px; }

.message-list { display: flex; flex-direction: column; gap: 20px; }
.message-item { display: flex; align-items: flex-start; gap: 10px; max-width: 85%; }
.message-item.sent { align-self: flex-end; flex-direction: row-reverse; }
.message-item.received { align-self: flex-start; }

.avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.avatar img { width: 100%; height: 100%; }

.msg-bubble { padding: 12px 16px; border-radius: 18px; font-size: 14px; position: relative; line-height: 1.5; }
.sent .msg-bubble { background: var(--primary-color); color: white; border-top-right-radius: 4px; }
.received .msg-bubble { background: white; color: var(--text-main); border-top-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.time { font-size: 10px; opacity: 0.6; display: block; margin-top: 4px; text-align: right; }
.sent .time { color: rgba(255,255,255,0.8); }

.input-bar { padding: 15px 20px 40px; background: white; border-top: 1px solid #eee; display: flex; gap: 12px; align-items: center; }
.input-bar input { flex: 1; border: none; background: #f5f5f5; padding: 12px 18px; border-radius: 24px; font-size: 14px; outline: none; }
.send-btn { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); color: white; border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.3s; }
.send-btn:disabled { opacity: 0.5; }
.send-btn i { font-size: 20px; }

.center-msg { text-align: center; padding-top: 100px; color: #999; font-size: 14px; }
</style>
