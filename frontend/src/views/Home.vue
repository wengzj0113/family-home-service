<template>
  <div class="home-container">
    <div class="header">
      <div class="location">
        <i class="ri-map-pin-2-fill"></i>
        <span>上海市 浦东新区</span>
      </div>
      <div class="user-avatar" @click="$router.push('/profile')">
        <img v-if="user" :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.phone}`" alt="avatar">
        <i v-else class="ri-user-line" style="font-size: 20px; color: #999;"></i>
      </div>
    </div>

    <div class="main-content">
      <!-- 提示消息 -->
      <div v-if="notice" class="toast-notice" :class="notice.type">
        <i :class="notice.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'"></i>
        {{ notice.msg }}
      </div>

      <!-- 角色切换 -->
      <div class="role-switch">
        <div :class="['role-btn', role === 'customer' ? 'active' : '']" @click="role = 'customer'">我是客户</div>
        <div :class="['role-btn', role === 'worker' ? 'active' : '']" @click="role = 'worker'">我是服务人员</div>
      </div>

      <div v-if="role === 'customer'" class="view-container">
        <div class="search-bar">
          <i class="ri-search-line"></i>
          <span>搜索您需要的家政服务...</span>
        </div>

        <div class="banner-slider">
          <div v-for="b in banners" :key="b.id" class="banner-item" @click="b.linkUrl && (window.location.href = b.linkUrl)">
            <img :src="b.imageUrl" :alt="b.title">
            <div class="banner-content">
              <h2>{{ b.title }}</h2>
              <div class="banner-btn">立即预约</div>
            </div>
          </div>
          <!-- Fallback if no banners -->
          <div v-if="banners.length === 0" class="banner">
            <h2>春节大扫除</h2>
            <p>全屋深度保洁，限时 8.5 折</p>
            <div class="banner-btn" @click="$router.push('/order/create')">立即预约</div>
            <i class="ri-home-heart-line banner-icon"></i>
          </div>
        </div>

        <div class="section-title">
          <span>服务分类</span>
        </div>
        <div class="grid-services">
          <div class="service-item" v-for="s in categories" :key="s.id" @click="$router.push(`/order/create?categoryId=${s.id}`)">
            <div class="icon-box" :style="{ color: s.color || '#2D5AFE' }"><i :class="s.icon"></i></div>
            <span>{{ s.name }}</span>
          </div>
        </div>
      </div>

      <div v-else class="view-container">
        <!-- 师傅端顶部状态 -->
        <div class="worker-status-card" @click="$router.push('/worker/verify')">
          <div class="status-info">
            <strong>未认证服务人员</strong>
            <p>认证后即可解锁全部订单收益</p>
          </div>
          <i class="ri-arrow-right-s-line"></i>
        </div>

        <div class="section-title">
          <span>抢单大厅</span>
          <span class="badge" v-if="orders.length > 0">{{ orders.length }} 条新订单</span>
        </div>

        <!-- 排序和筛选 -->
        <div class="filter-bar">
          <div class="sort-tabs">
            <span :class="{ active: query.sort === 'distance' }" @click="updateSort('distance')">距离</span>
            <span :class="{ active: query.sort === 'price' }" @click="updateSort('price')">价格</span>
            <span :class="{ active: query.sort === 'rating' }" @click="updateSort('rating')">评分</span>
          </div>
          <select v-model="query.radius" @change="fetchOrders" class="range-select">
            <option :value="null">全城</option>
            <option :value="1">1km内</option>
            <option :value="3">3km内</option>
            <option :value="5">5km内</option>
            <option :value="10">10km内</option>
          </select>
        </div>

        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="orders.length === 0" class="empty">暂无可用订单</div>
        
        <div class="order-card" v-for="o in orders" :key="o.id">
        <div class="order-header">
          <span class="order-type">{{ o.serviceType || '通用家政' }}</span>
          <span class="order-price">¥{{ o.amount }}</span>
        </div>
        <p class="order-title">{{ o.remark }}</p>
        <div class="order-info">
          <p><i class="ri-map-pin-line"></i> {{ o.location }} <span v-if="o.distance" class="dist-tag">{{ (o.distance / 1000).toFixed(1) }}km</span></p>
          <p><i class="ri-calendar-event-line"></i> {{ formatTime(o.serviceTime) }}</p>
          <p v-if="o.customer?.customerScore"><i class="ri-star-fill" style="color: #FF9500"></i> 客户评分: {{ o.customer.customerScore }}</p>
        </div>
        <button class="grab-btn" @click="handleGrab(o)" :disabled="grabbing === o.id">
          {{ grabbing === o.id ? '抢单中...' : `立即抢单 (预计赚 ¥${calculateEarnings(o.amount)})` }}
        </button>
        </div>
      </div>
    </div>

    <!-- 悬浮下单按钮（客户端） -->
    <div v-if="role === 'customer'" class="fab-btn" @click="$router.push('/order/create')">
      <i class="ri-add-line"></i>
    </div>

    <!-- 悬浮 AI 客服入口（所有角色可见） -->
    <div class="ai-fab" @click="showAiDialog = true">
      <i class="ri-customer-service-2-line"></i>
    </div>

    <!-- AI 客服对话弹框 -->
    <div v-if="showAiDialog" class="ai-dialog-mask" @click.self="showAiDialog = false">
      <div class="ai-dialog">
        <div class="ai-dialog-header">
          <div class="left">
            <i class="ri-customer-service-2-line"></i>
            <span>AI 智能客服</span>
          </div>
          <i class="ri-close-line" @click="showAiDialog = false"></i>
        </div>
        <div class="ai-dialog-body">
          <div class="ai-dialog-tip">可以直接问我：如何下单、怎么当师傅赚钱、订单怎么取消、优惠券为什么用不了等。</div>
          <textarea
            v-model="aiQuestion"
            rows="3"
            placeholder="请输入您的问题，例如：我可以当师傅吗？我也想赚钱"
          ></textarea>
          <button
            class="ai-dialog-btn"
            :disabled="aiLoading || !aiQuestion.trim()"
            @click="handleAiAsk"
          >
            {{ aiLoading ? '思考中...' : '问一问 AI 客服' }}
          </button>
          <div v-if="aiAnswer" class="ai-dialog-answer">
            <div class="title">AI 客服回复：</div>
            <p>{{ aiAnswer }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../api'
import { getCurrentLocation } from '../utils/location'

const role = ref('customer')
const user = ref(null)
const loading = ref(false)
const grabbing = ref(null)
const orders = ref([])
const notice = ref(null)
const categories = ref([])
const banners = ref([])

// 首页悬浮 AI 客服
const showAiDialog = ref(false)
const aiQuestion = ref('')
const aiAnswer = ref('')
const aiLoading = ref(false)

const query = ref({
  lat: null,
  lng: null,
  radius: null,
  sort: 'distance'
})

const updateSort = (s) => {
  query.value.sort = s
  fetchOrders()
}

const showNotice = (msg, type = 'error') => {
  notice.value = { msg, type }
  setTimeout(() => {
    notice.value = null
  }, 3000)
}

const fetchUser = () => {
  const userData = localStorage.getItem('user')
  if (userData) {
    user.value = JSON.parse(userData)
    // 如果用户只有师傅身份，默认切换到师傅端，否则默认客户端
    if (user.value.roles?.includes('worker') && !user.value.roles?.includes('customer')) {
      role.value = 'worker'
    }
  }
}

const fetchCategories = async () => {
  try {
    const res = await api.get('/service-categories')
    categories.value = res.data
  } catch (err) {
    console.error('Failed to fetch categories')
  }
}

const fetchBanners = async () => {
  try {
    const res = await api.get('/config/banners/active')
    banners.value = res.data
  } catch (err) {
    console.error('Failed to fetch banners')
  }
}

const services = [
  { name: '日常保洁', icon: 'ri-brush-line', color: '#2D5AFE' },
  { name: '家电清洗', icon: 'ri-water-flash-line', color: '#FF9500' },
  { name: '搬家运输', icon: 'ri-truck-line', color: '#34C759' },
  { name: '保姆月嫂', icon: 'ri-mickey-line', color: '#FF2D55' }
]

const initLocation = async () => {
  try {
    const loc = await getCurrentLocation()
    query.value.lat = loc.lat
    query.value.lng = loc.lng
    // 同时同步给后端
    api.patch('/auth/location', loc).catch(console.error)
  } catch (err) {
    console.warn('Geolocation failed:', err.message)
    // 如果获取失败，可以设置一个默认位置（如北京/上海中心）
    query.value.lat = 31.2304 // 上海
    query.value.lng = 121.4737
  }
}

const fetchOrders = async () => {
  if (role.value !== 'worker') return
  loading.value = true
  try {
    const res = await api.get('/orders/pending', { params: query.value })
    orders.value = res.data
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleGrab = async (order) => {
  if (!user.value) {
    showNotice('请先登录账号')
    // router.push('/login') // router is not defined in this snippet, fix if needed
    return
  }

  if (!user.value?.roles?.includes('worker')) {
    showNotice('抱歉，您的账户身份是“客户”，无法抢单。请认证或开启“师傅”身份。')
    return
  }
  
  grabbing.value = order.id
  try {
    await api.post(`/orders/${order.id}/grab`)
    showNotice('抢单成功！请在“我的订单”中查看联系方式。', 'success')
    fetchOrders()
  } catch (error) {
    const msg = error.response?.data?.message || error.message || '抢单失败'
    showNotice('抢单失败：' + msg)
  } finally {
    grabbing.value = null
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return '未知时间'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
}

const calculateEarnings = (amount) => {
  const level = user.value?.level || 1
  const commissionRates = { 1: 0.12, 2: 0.10, 3: 0.08, 4: 0.06, 5: 0.05 }
  const rate = commissionRates[level] || 0.10
  return (amount * (1 - rate)).toFixed(2)
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

watch(role, (newRole) => {
  if (newRole === 'worker') fetchOrders()
})

onMounted(async () => {
  fetchUser()
  fetchCategories()
  fetchBanners()
  if (role.value === 'worker') {
    await initLocation()
    fetchOrders()
  }
})
</script>

<style scoped>
.home-container { height: 100%; display: flex; flex-direction: column; width: 100%; }
.header { padding: 50px 20px 10px; display: flex; justify-content: space-between; align-items: center; background: white; flex-shrink: 0; }
.location { display: flex; align-items: center; font-size: 14px; font-weight: 600; }
.location i { color: var(--primary-color); margin-right: 4px; }
.user-avatar { width: 36px; height: 36px; border-radius: 12px; background: #eee; overflow: hidden; cursor: pointer; }
.user-avatar img { width: 100%; }

.main-content { flex: 1; overflow-y: auto; padding: 0 20px 100px; position: relative; }

.toast-notice {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 12px 20px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  width: 80%;
  max-width: 300px;
}
.toast-notice.error { background: #FF3B30; }
.toast-notice.success { background: var(--success-color); }

.role-switch { background: #E0E5EC; padding: 4px; border-radius: 12px; display: flex; font-size: 12px; margin: 20px 0; }
.role-btn { flex: 1; text-align: center; padding: 8px; border-radius: 10px; cursor: pointer; transition: 0.3s; }
.role-btn.active { background: white; box-shadow: var(--shadow); color: var(--primary-color); font-weight: 600; }

.worker-status-card { background: linear-gradient(135deg, #FF9500 0%, #FFCC00 100%); padding: 15px; border-radius: 16px; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(255, 149, 0, 0.2); }
.status-info strong { display: block; font-size: 16px; margin-bottom: 4px; }
.status-info p { font-size: 11px; opacity: 0.9; }

.search-bar { background: var(--card-bg); padding: 12px 16px; border-radius: 16px; margin: 15px 0; display: flex; align-items: center; color: var(--text-sub); box-shadow: var(--shadow); font-size: 14px; }
.search-bar i { margin-right: 10px; }

.banner-slider { overflow-x: auto; display: flex; gap: 15px; margin-bottom: 25px; padding-bottom: 5px; scroll-snap-type: x mandatory; }
.banner-item { min-width: 100%; height: 160px; border-radius: 20px; overflow: hidden; position: relative; scroll-snap-align: start; flex-shrink: 0; }
.banner-item img { width: 100%; height: 100%; object-fit: cover; }
.banner-content { position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.4), transparent); padding: 20px; color: white; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.banner-content h2 { font-size: 20px; margin-bottom: 10px; }

.banner { background: linear-gradient(135deg, #2D5AFE 0%, #6485FF 100%); border-radius: 20px; padding: 20px; color: white; position: relative; overflow: hidden; margin-bottom: 25px; }
.banner h2 { font-size: 20px; margin-bottom: 8px; }
.banner p { font-size: 12px; opacity: 0.9; }
.banner-btn { display: inline-block; margin-top: 15px; background: white; color: var(--primary-color); padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; }
.banner-icon { position: absolute; right: 10px; bottom: 10px; font-size: 80px; opacity: 0.2; }

.section-title { font-size: 18px; font-weight: 700; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
.badge { font-size: 12px; background: #FF9500; color: white; padding: 2px 8px; border-radius: 4px; }

.filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 8px 12px; border-radius: 12px; }
.sort-tabs { display: flex; gap: 15px; font-size: 13px; color: var(--text-sub); }
.sort-tabs span { cursor: pointer; transition: 0.2s; }
.sort-tabs span.active { color: var(--primary-color); font-weight: 700; }
.range-select { border: none; background: transparent; font-size: 13px; color: var(--text-main); font-weight: 600; outline: none; }

.dist-tag { font-size: 11px; background: #f0f0f0; color: #666; padding: 1px 4px; border-radius: 4px; margin-left: 5px; }

.grid-services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
.service-item { text-align: center; cursor: pointer; }
.icon-box { width: 55px; height: 55px; background: var(--card-bg); border-radius: 18px; display: flex; justify-content: center; align-items: center; margin: 0 auto 8px; box-shadow: var(--shadow); }
.icon-box i { font-size: 24px; }
.service-item span { font-size: 12px; font-weight: 500; }

.order-card { background: var(--card-bg); border-radius: 20px; padding: 16px; margin-bottom: 15px; box-shadow: var(--shadow); }
.order-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.order-type { background: #EEF2FF; color: var(--primary-color); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.order-price { color: #FF3B30; font-weight: 700; font-size: 18px; }
.order-title { font-weight: 600; margin-bottom: 8px; font-size: 15px; }
.order-info { font-size: 13px; color: var(--text-sub); line-height: 1.6; }
.grab-btn { width: 100%; margin-top: 15px; background: var(--primary-color); color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.grab-btn:active { transform: scale(0.98); opacity: 0.9; }
.grab-btn:disabled { background: #ccc; cursor: not-allowed; }

.loading, .empty { text-align: center; padding: 40px; color: var(--text-sub); font-size: 14px; }

.fab-btn { position: absolute; bottom: 100px; right: 20px; width: 56px; height: 56px; background: var(--primary-color); border-radius: 28px; display: flex; justify-content: center; align-items: center; color: white; font-size: 24px; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.4); cursor: pointer; z-index: 100; }

.ai-fab {
  position: absolute;
  bottom: 30px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: #ffffff;
  color: var(--primary-color);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  z-index: 110;
}

.ai-fab i {
  font-size: 24px;
}

.ai-dialog-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0 16px 110px;
  z-index: 120;
}

.ai-dialog {
  width: 100%;
  max-width: 360px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}

.ai-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f1f5;
}

.ai-dialog-header .left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}

.ai-dialog-header .left i {
  color: var(--primary-color);
  font-size: 18px;
}

.ai-dialog-header .ri-close-line {
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.ai-dialog-body {
  padding: 10px 14px 12px;
  font-size: 13px;
}

.ai-dialog-tip {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 6px;
}

.ai-dialog-body textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #eee;
  padding: 8px 10px;
  resize: none;
  font-size: 13px;
  outline: none;
}

.ai-dialog-btn {
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

.ai-dialog-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-dialog-answer {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8f9ff;
  font-size: 13px;
  color: var(--text-main);
  max-height: 180px;
  overflow-y: auto;
}

.ai-dialog-answer .title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--primary-color);
}
</style>
