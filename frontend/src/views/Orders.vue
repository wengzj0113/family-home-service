<template>
  <div class="orders-container">
    <div class="nav-header">
      <span>我的订单</span>
    </div>

    <div class="main-content">
      <div class="tabs">
        <div :class="['tab', activeTab === 'current' ? 'active' : '']" @click="activeTab = 'current'">进行中</div>
        <div :class="['tab', activeTab === 'history' ? 'active' : '']" @click="activeTab = 'history'">已完成</div>
      </div>

      <div v-if="loading" class="center-msg">加载中...</div>
      <div v-else-if="filteredOrders.length === 0" class="center-msg">
        <i class="ri-file-list-3-line" style="font-size: 48px; color: #ddd; display: block; margin-bottom: 10px;"></i>
        暂无相关订单
      </div>

      <div class="order-list" v-else>
        <div class="order-card" v-for="o in filteredOrders" :key="o.id">
          <div class="card-header">
            <span class="type-tag">{{ o.serviceType || '通用家政' }}</span>
            <span class="status-text">{{ getStatusText(o.status) }}</span>
          </div>
          <div class="card-body">
            <h4>{{ o.remark || '无备注' }}</h4>
            <p><i class="ri-map-pin-line"></i> {{ o.location }}</p>
            <p><i class="ri-time-line"></i> {{ formatTime(o.serviceTime) }}</p>
            <div v-if="o.status >= 1 && o.worker" class="worker-info" @click="$router.push(`/worker/${o.workerId}`)">
              <img :src="o.worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${o.worker.nickname}`">
              <span>服务师傅: {{ o.worker.nickname }}</span>
              <i class="ri-arrow-right-s-line"></i>
            </div>
            <div class="order-badges">
              <span v-if="o.hasInsurance" class="badge-insurance"><i class="ri-shield-check-fill"></i> 意外险保障中</span>
            </div>

            <!-- 电子服务单 (师傅端在服务中可见) -->
            <div v-if="o.status === 7 && user?.id === o.workerId" class="service-checklist">
              <h5><i class="ri-list-check"></i> 电子服务清单</h5>
              <div class="checklist-items">
                <div v-for="item in (o.category?.checklist || '').split(',')" :key="item" class="check-item" @click="toggleCheckItem(o, item)">
                  <i :class="isItemChecked(o, item) ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'"></i>
                  <span>{{ item }}</span>
                </div>
              </div>
            </div>

            <!-- 距离展示 (客户在师傅出发后可见) -->
            <div v-if="o.status === 5 && user?.id === o.customerId" class="distance-info">
              <i class="ri-map-pin-user-line"></i>
              <span v-if="trackingData[o.id]">
                师傅距离您约 <strong>{{ trackingData[o.id].distance }}km</strong>，
                预计 <strong>{{ trackingData[o.id].etaMinutes }}分钟</strong> 后到达
              </span>
              <span v-else>正在获取师傅实时位置...</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="price">¥{{ o.amount }}</span>
            <div class="actions">
              <!-- 沟通按钮 -->
              <button v-if="[1, 5, 6, 7].includes(o.status)" class="chat-btn" @click="contactUser(o)">联系对方</button>
              
              <!-- 师傅操作 -->
              <template v-if="user?.id === o.workerId">
                <button v-if="o.status === 1" class="action-btn" @click="handleStatusUpdate(o.id, 'depart')">已出发</button>
                <button v-if="o.status === 5" class="action-btn" @click="handleStatusUpdate(o.id, 'arrive')">已到达</button>
                <button v-if="o.status === 6" class="action-btn" @click="handleStatusUpdate(o.id, 'start')">开始服务</button>
                <button v-if="o.status === 7" class="action-btn" @click="completeOrder(o.id)">确认完成</button>
              </template>

              <!-- 客户操作 -->
              <template v-if="user?.id === o.customerId">
                <button v-if="o.status === 7" class="action-btn" @click="completeOrder(o.id)">确认完成</button>
                <button v-if="o.status === 2" class="pay-btn" @click="payOrder(o)">去支付</button>
              </template>
              
              <button v-if="o.status >= 2 && o.status !== 3" class="rate-btn" @click="$router.push(`/rating/create/${o.id}`)">去评价</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const activeTab = ref('current')
const loading = ref(false)
const allOrders = ref([])
const user = ref(null)
const trackingData = ref({})
let trackingTimer = null

const getStatusText = (status) => {
  const texts = {
    0: '待抢单',
    1: '待出发',
    2: '待支付',
    3: '已取消',
    4: '已结算',
    5: '师傅已出发',
    6: '师傅已到达',
    7: '服务中'
  }
  return texts[status] || '未知'
}

const filteredOrders = computed(() => {
  return allOrders.value.filter(o => {
    if (activeTab.value === 'current') return [0, 1, 5, 6, 7].includes(o.status)
    return o.status >= 2 && o.status !== 3
  })
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/orders/my') 
    allOrders.value = res.data
    
    const userData = localStorage.getItem('user')
    if (userData) user.value = JSON.parse(userData)

    // 针对“已出发”的订单，开启实时追踪
    startTracking()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const startTracking = () => {
  stopTracking() // 先清除旧的
  const departOrders = allOrders.value.filter(o => o.status === 5 && user.value?.id === o.customerId)
  if (departOrders.length === 0) return

  const updateAll = async () => {
    for (const o of departOrders) {
      try {
        const res = await api.get(`/orders/${o.id}/track`)
        trackingData.value[o.id] = res.data
      } catch (e) {
        console.error('Tracking failed for order', o.id, e)
      }
    }
  }

  updateAll() // 立即执行一次
  trackingTimer = setInterval(updateAll, 10000) // 每10秒更新一次
}

const stopTracking = () => {
  if (trackingTimer) {
    clearInterval(trackingTimer)
    trackingTimer = null
  }
}

const contactUser = (order) => {
  const isWorker = user.value?.roles?.includes('worker') && order?.workerId === user.value?.id
  const targetId = isWorker ? order.customerId : order.workerId
  // 简化的逻辑，实际可能需要从后端获取对方昵称
  router.push(`/chat/${targetId}?orderId=${order.id}`)
}

const handleStatusUpdate = async (id, action) => {
  try {
    let url = `/orders/${id}/${action}`
    const body = {}
    if (action === 'arrive') {
      // 如果有定位，可以传过去
      body.lat = 31.23 // 示例
      body.lng = 121.47
    }
    await api.patch(url, body)
    fetchOrders()
  } catch (err) {
    alert(err.response?.data?.message || '操作失败')
  }
}

const completeOrder = async (id) => {
  const order = allOrders.value.find(o => o.id === id)
  const isWorker = user.value?.roles?.includes('worker') && order?.workerId === user.value?.id

  if (order.status !== 7 && order.status !== 1) {
    alert('请按流程操作：出发 -> 到达 -> 开始服务 -> 确认完成')
    return
  }

  if (isWorker) {
    // 师傅必须跳评价页面
    router.push(`/rating/create/${id}?action=complete`)
  } else {
    // 客户可选
    if (confirm('确认服务已完成吗？')) {
      try {
        await api.patch(`/orders/${id}/complete`)
        if (confirm('确认成功！要给师傅打个分吗？')) {
          router.push(`/rating/create/${id}`)
        } else {
          fetchOrders()
        }
      } catch (err) {
        alert(err.response?.data?.message || '操作失败')
      }
    }
  }
}

const payOrder = async (order) => {
  const method = confirm('使用支付宝支付吗？（取消则使用微信支付）') ? 'alipay' : (confirm('确认使用微信支付吗？') ? 'wechat' : 'mock')
  
  try {
    const res = await api.post('/transactions/create-payment', {
      orderId: order.id,
      method: method
    })

    if (method === 'mock') {
      alert('模拟支付发起成功！正在处理...')
      await api.post(`/transactions/alipay/notify-mock`, { out_trade_no: order.orderNo })
      alert('模拟支付已完成')
      fetchOrders()
    } else if (method === 'alipay') {
      // 支付宝支付：res.data.data 包含 HTML 表单
      if (res.data.success && res.data.data) {
        const div = document.createElement('div')
        div.style.display = 'none'
        div.innerHTML = res.data.data
        document.body.appendChild(div)
        const form = div.querySelector('form')
        if (form) form.submit()
        else window.location.href = res.data.data
      }
    } else if (method === 'wechat') {
      // 微信支付：res.data.data 包含跳转 URL
      if (res.data.success && res.data.data) {
        window.location.href = res.data.data
      }
    }
  } catch (err) {
    console.error(err)
    alert(err.response?.data?.message || '支付系统异常')
  }
}

const formatTime = (t) => t ? new Date(t).toLocaleString() : '尽快上门'

const toggleCheckItem = async (order, item) => {
  let checked = (order.completedItems || '').split(',').filter(i => i);
  const index = checked.indexOf(item);
  if (index > -1) {
    checked.splice(index, 1);
  } else {
    checked.push(item);
  }
  
  try {
    await api.patch(`/orders/${order.id}/items`, { completedItems: checked.join(',') });
    order.completedItems = checked.join(',');
  } catch (err) {
    console.error(err);
  }
};

const isItemChecked = (order, item) => {
  return (order.completedItems || '').split(',').includes(item);
};

const mockDistance = (o) => (Math.random() * 2 + 0.5).toFixed(1);
const mockTime = (o) => Math.floor(Math.random() * 15 + 5);

onMounted(fetchOrders)
import { onUnmounted } from 'vue'
onUnmounted(stopTracking)
</script>

<style scoped>
.orders-container { height: 100%; display: flex; flex-direction: column; width: 100%; background: var(--bg-color); }
.nav-header { padding: 50px 20px 15px; background: white; text-align: center; font-weight: 700; font-size: 18px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.tabs { display: flex; background: white; padding: 5px; border-radius: 12px; margin-bottom: 20px; box-shadow: var(--shadow); }
.tab { flex: 1; text-align: center; padding: 10px; font-size: 14px; color: var(--text-sub); border-radius: 8px; cursor: pointer; transition: 0.3s; }
.tab.active { background: var(--primary-color); color: white; font-weight: 600; }

.order-card { background: white; border-radius: 16px; padding: 15px; margin-bottom: 15px; box-shadow: var(--shadow); }
.card-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.type-tag { background: #EEF2FF; color: var(--primary-color); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.status-text { color: var(--secondary-color); font-size: 12px; font-weight: 600; }
.card-body h4 { margin-bottom: 8px; font-size: 15px; }
.card-body p { font-size: 12px; color: var(--text-sub); margin-bottom: 4px; }
.card-footer { border-top: 1px solid #f5f5f5; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
.price { color: #FF3B30; font-weight: 700; font-size: 16px; }
.order-badges { margin-top: 10px; display: flex; gap: 8px; }
.badge-insurance { font-size: 10px; color: #38A169; background: #F0FFF4; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 3px; font-weight: 600; }

.service-checklist { margin-top: 15px; padding: 12px; background: #f9f9f9; border-radius: 10px; }
.service-checklist h5 { font-size: 13px; margin-bottom: 10px; color: #333; display: flex; align-items: center; gap: 4px; }
.checklist-items { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.check-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; cursor: pointer; }
.check-item i { font-size: 16px; color: var(--primary-color); }
.check-item i.ri-checkbox-blank-line { color: #ccc; }

.distance-info { margin-top: 15px; padding: 12px; background: #EBF8FF; color: #2B6CB0; border-radius: 10px; font-size: 12px; display: flex; align-items: center; gap: 8px; }
.distance-info i { font-size: 18px; }
.distance-info strong { color: #2C5282; }

.action-btn { background: var(--success-color); color: white; border: none; padding: 6px 15px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.chat-btn { background: var(--primary-color); color: white; border: none; padding: 6px 15px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.pay-btn { background: #00A3FF; color: white; border: none; padding: 6px 15px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.rate-btn { background: #FF9500; color: white; border: none; padding: 6px 15px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
.actions { display: flex; gap: 8px; }

.center-msg { text-align: center; padding-top: 100px; color: var(--text-sub); font-size: 14px; }
</style>
