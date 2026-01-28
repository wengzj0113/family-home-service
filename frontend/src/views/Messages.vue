<template>
  <div class="page-container">
    <div class="nav-header">
      <div style="width: 24px;"></div>
      <span>消息中心</span>
      <span class="read-all" @click="handleReadAll" v-if="notifications.length > 0">全标已读</span>
      <div v-else style="width: 24px;"></div>
    </div>

    <div class="main-content">
      <!-- AI 客服区域 -->
      <div class="ai-card">
        <div class="ai-header">
          <div class="ai-title">
            <i class="ri-customer-service-2-line"></i>
            <span>AI 智能客服</span>
          </div>
          <small>可先问我常见问题，再转人工</small>
        </div>
        <textarea
          v-model="aiQuestion"
          placeholder="例如：如何取消订单？优惠券为什么不能用？"
          rows="2"
        ></textarea>
        <button class="ai-btn" :disabled="aiLoading || !aiQuestion.trim()" @click="handleAiAsk">
          {{ aiLoading ? '思考中...' : '问一问 AI 客服' }}
        </button>
        <div v-if="aiAnswer" class="ai-answer">
          <div class="ai-answer-title">AI 客服回复：</div>
          <p>{{ aiAnswer }}</p>
        </div>
      </div>
      <div v-if="loading && notifications.length === 0" class="loading">加载中...</div>
      <div v-else-if="notifications.length === 0" class="empty">
        <i class="ri-message-3-line"></i>
        <p>暂无消息内容</p>
      </div>
      <div v-else class="msg-list">
        <div 
          v-for="item in notifications" 
          :key="item.id" 
          :class="['msg-item', item.isRead ? 'read' : 'unread']"
          @click="handleMarkRead(item)"
        >
          <div class="msg-icon" :class="item.type">
            <i :class="getIcon(item.type)"></i>
          </div>
          <div class="msg-body">
            <div class="msg-header">
              <span class="title">{{ item.title }}</span>
              <span class="time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <p class="content">{{ item.content }}</p>
          </div>
          <div v-if="!item.isRead" class="unread-dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const notifications = ref([])
const loading = ref(false)
const aiQuestion = ref('')
const aiAnswer = ref('')
const aiLoading = ref(false)

const getIcon = (type) => {
  const icons = {
    system: 'ri-notification-3-line',
    order: 'ri-file-list-3-line',
    finance: 'ri-wallet-3-line'
  }
  return icons[type] || 'ri-message-3-line'
}

const formatTime = (t) => {
  const date = new Date(t)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const fetchNotifications = async () => {
  loading.value = true
  try {
    const res = await api.get('/notifications')
    notifications.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleAiAsk = async () => {
  if (!aiQuestion.value.trim()) return
  aiLoading.value = true
  aiAnswer.value = ''
  try {
    const res = await api.post('/support/ai-chat', {
      message: aiQuestion.value.trim(),
    })
    aiAnswer.value = res.data.reply || res.data.message || '暂时无法获取回复，请稍后重试。'
  } catch (err) {
    console.error(err)
    aiAnswer.value = err.response?.data?.message || 'AI 客服暂时不可用，请稍后再试或联系客服人工。'
  } finally {
    aiLoading.value = false
  }
}

const handleMarkRead = async (item) => {
  if (item.isRead) return
  try {
    await api.patch(`/notifications/${item.id}/read`)
    item.isRead = true
  } catch (err) {
    console.error(err)
  }
}

const handleReadAll = async () => {
  try {
    await api.post('/notifications/read-all')
    notifications.value.forEach(n => n.isRead = true)
  } catch (err) {
    console.error(err)
  }
}

onMounted(fetchNotifications)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }
.nav-header .read-all { font-size: 13px; color: var(--primary-color); font-weight: 500; cursor: pointer; }

.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.ai-card {
  background: white;
  border-radius: 16px;
  padding: 12px 12px 14px;
  margin-bottom: 15px;
  box-shadow: var(--shadow);
  font-size: 13px;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ai-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.ai-title i {
  font-size: 18px;
  color: var(--primary-color);
}
.ai-header small {
  font-size: 11px;
  color: var(--text-sub);
}
.ai-card textarea {
  width: 100%;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #eee;
  resize: none;
  font-size: 13px;
  outline: none;
}
.ai-btn {
  margin-top: 8px;
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 8px 0;
  background: var(--primary-color);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.ai-answer {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8f9ff;
  font-size: 13px;
  color: var(--text-main);
}
.ai-answer-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--primary-color);
}

.msg-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }
.msg-item { background: white; padding: 15px; border-radius: 16px; display: flex; align-items: flex-start; gap: 12px; position: relative; box-shadow: var(--shadow); transition: 0.3s; }
.msg-item:active { transform: scale(0.98); }
.msg-item.read { opacity: 0.7; }

.msg-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 20px; flex-shrink: 0; }
.msg-icon.system { background: #EEF2FF; color: #2D5AFE; }
.msg-icon.order { background: #FFF7ED; color: #FF9500; }
.msg-icon.finance { background: #F0FDF4; color: #34C759; }

.msg-body { flex: 1; }
.msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.msg-header .title { font-weight: 700; font-size: 15px; color: var(--text-main); }
.msg-header .time { font-size: 11px; color: var(--text-sub); }
.msg-body .content { font-size: 13px; color: var(--text-sub); line-height: 1.5; margin: 0; }

.unread-dot { position: absolute; top: 15px; right: 15px; width: 8px; height: 8px; background: #FF3B30; border-radius: 50%; }

.loading, .empty { text-align: center; padding-top: 100px; color: #999; }
.empty i { font-size: 64px; color: #eee; display: block; margin-bottom: 10px; }
</style>
