<template>
  <div class="profile-container">
    <div class="profile-header">
      <div v-if="user" class="user-info">
        <div class="avatar">
          <img :src="user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.phone}`" alt="avatar">
        </div>
        <div class="name-info">
          <div class="name-row">
            <h3>{{ user.nickname || '新用户' }}</h3>
            <span v-if="user" class="level-tag">Lv.{{ user.level || 1 }}</span>
          </div>
          <p v-if="user" class="user-title">{{ userTitle }}</p>
          <span>{{ maskPhone(user.phone) }}</span>
          <div class="roles-box">
            <div v-for="r in user.roles" :key="r" class="role-badge">
              {{ r === 'worker' ? '专业服务者' : '尊贵客户' }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="user-info" @click="$router.push('/login')">
        <div class="avatar">
          <i class="ri-user-line" style="font-size: 32px; color: #ccc;"></i>
        </div>
        <div class="name-info">
          <h3>请登录</h3>
          <span>点击登录账号</span>
        </div>
      </div>
      <i class="ri-settings-3-line settings-icon" @click="router.push('/settings')"></i>
    </div>

    <div class="main-content">
      <div class="stats-row">
        <div class="stat-card" @click="router.push('/orders')">
          <strong>{{ stats.orders }}</strong>
          <span>我的订单</span>
        </div>
        <div class="stat-card" @click="router.push('/wallet')">
          <strong>¥{{ stats.balance.toFixed(2) }}</strong>
          <span>钱包余额</span>
        </div>
        <div class="stat-card">
          <strong>{{ stats.rating }}</strong>
          <span>我的评分</span>
        </div>
      </div>

      <div class="menu-list">
        <div v-if="user?.roles?.includes('worker')" class="benefits-section">
          <div class="section-title">等级权益</div>
          <div class="benefits-grid">
            <div class="benefit-item">
              <div class="icon-box"><i class="ri-percent-line"></i></div>
              <span>佣金减免</span>
            </div>
            <div class="benefit-item" :class="{ locked: (user?.level || 1) < 3 }">
              <div class="icon-box"><i class="ri-flashlight-line"></i></div>
              <span>优先派单</span>
              <i v-if="(user?.level || 1) < 3" class="ri-lock-line lock"></i>
            </div>
            <div class="benefit-item" :class="{ locked: (user?.level || 1) < 5 }">
              <div class="icon-box"><i class="ri-customer-service-2-line"></i></div>
              <span>专属客服</span>
              <i v-if="(user?.level || 1) < 5" class="ri-lock-line lock"></i>
            </div>
          </div>
        </div>

        <div class="menu-item" @click="router.push('/address/list')">
          <div class="left"><i class="ri-map-pin-user-line"></i> 地址管理</div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
        <div class="menu-item" @click="router.push('/my-coupons')">
          <div class="left"><i class="ri-ticket-2-line"></i> 我的优惠券</div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
        <div class="menu-item" @click="router.push('/store')">
          <div class="left"><i class="ri-shopping-bag-line"></i> 商城与积分</div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
        <div class="menu-item" @click="router.push('/coupons')">
          <div class="left"><i class="ri-ticket-line"></i> 领券中心</div>
          <i class="ri-arrow-right-s-line"></i>
        </div>

        <div class="invite-card">
          <div class="invite-text">
            <h4>邀请好友下单</h4>
            <p>各得 10 元代金券</p>
          </div>
          <div class="code-box" @click="copyInviteCode">
            <span class="label">我的邀请码</span>
            <span class="code">{{ user?.inviteCode }}</span>
            <i class="ri-file-copy-line"></i>
          </div>
        </div>

        <div v-if="user?.roles?.includes('worker')" class="menu-item" @click="$router.push('/worker/verify')">
          <div class="left"><i class="ri-shield-check-line"></i> 服务人员认证</div>
          <span :class="['tag', auditStatusClass]">{{ auditStatusText }}</span>
        </div>
        <div v-if="user?.roles?.includes('admin')" class="menu-item" @click="openAdmin">
          <div class="left"><i class="ri-admin-line"></i> 后台管理系统</div>
          <i class="ri-arrow-right-line"></i>
        </div>
        <div v-if="auditStatus === 1" class="mock-admin-btn" @click="handleMockApprove">
          <i class="ri-admin-line"></i> 演示：点我模拟后台审核通过
        </div>
        <div class="menu-item" @click="router.push('/messages')">
          <div class="left"><i class="ri-customer-service-2-line"></i> 帮助与客服</div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
        <div v-if="user" class="menu-item logout" @click="handleLogout">
          <div class="left"><i class="ri-logout-box-r-line"></i> 退出登录</div>
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
const user = ref(null)
const stats = ref({
  orders: 0,
  balance: 0.00,
  rating: 5.0
})

const auditStatus = ref(0) // 0: 未认证, 1: 审核中, 2: 已认证, 3: 驳回

const auditStatusText = computed(() => {
  const texts = ['未认证', '审核中', '已认证', '未通过']
  return texts[auditStatus.value] || '未认证'
})

const auditStatusClass = computed(() => {
  const classes = ['', 'status-pending', 'status-verified', 'status-rejected']
  return classes[auditStatus.value]
})

const userTitle = computed(() => {
  if (!user.value) return ''
  const level = user.value.level || 1
  const isWorker = user.value.roles?.includes('worker')
  
  if (isWorker) {
    const workerTitles = {
      1: '待改进师傅',
      2: '准时师傅',
      3: '金牌师傅',
      4: '钻石服务商',
      5: '城市合伙人'
    }
    return workerTitles[level] || '服务先锋'
  } else {
    const customerTitles = {
      1: '普通用户',
      2: '诚信客户',
      3: '优质会员',
      4: '核心会员',
      5: '至尊红钻'
    }
    return customerTitles[level] || '尊贵客户'
  }
})

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2')
}

const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  if (!token) return
  
  try {
    const res = await api.get('/auth/profile')
    user.value = res.data
    localStorage.setItem('user', JSON.stringify(res.data))
    stats.value.balance = Number(res.data.balance || 0)
    if (res.data.profile) {
      auditStatus.value = res.data.profile.auditStatus
    }
    // Set rating based on current roles
    if (res.data.roles?.includes('worker')) {
      stats.value.rating = res.data.workerScore || 5.0
    } else {
      stats.value.rating = res.data.customerScore || 5.0
    }
  } catch (err) {
    if (err.response?.status === 401) {
      handleLogout()
    }
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  user.value = null
  router.push('/login')
}

const openAdmin = () => {
  const token = localStorage.getItem('token')
  window.open(`http://localhost:3002?token=${token}`, '_blank')
}

const copyInviteCode = () => {
  if (user.value?.inviteCode) {
    navigator.clipboard.writeText(user.value.inviteCode)
    alert('邀请码已复制到剪贴板')
  }
}

const handleMockApprove = async () => {
  try {
    await api.post('/auth/worker/approve-mock')
    alert('演示提示：后台审核已通过！')
    fetchProfile()
  } catch (err) {
    alert('模拟审批失败')
  }
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile-container { height: 100%; display: flex; flex-direction: column; width: 100%; background: var(--bg-color); }
.profile-header { background: linear-gradient(135deg, #2D5AFE 0%, #6485FF 100%); padding: 60px 20px 30px; display: flex; justify-content: space-between; align-items: flex-start; color: white; border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; flex-shrink: 0; }
.user-info { display: flex; align-items: center; cursor: pointer; }
.avatar { width: 64px; height: 64px; border-radius: 20px; border: 3px solid rgba(255,255,255,0.3); overflow: hidden; margin-right: 15px; background: white; display: flex; justify-content: center; align-items: center; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.level-tag { background: #FFD700; color: #8B4513; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.5); }
.user-title { font-size: 11px; opacity: 0.9; margin-bottom: 4px; font-style: italic; }
.name-info h3 { font-size: 20px; }
.name-info span { font-size: 12px; opacity: 0.8; display: block; }
.roles-box { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
.role-badge { display: inline-block; background: rgba(255,255,255,0.2); font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3); }
.settings-icon { font-size: 22px; opacity: 0.8; cursor: pointer; transition: 0.3s; }
.settings-icon:active { opacity: 1; transform: scale(1.1); }

.main-content { flex: 1; padding: 20px; margin-top: -30px; overflow-y: auto; }
.stats-row { display: flex; gap: 12px; margin-bottom: 25px; }
.stat-card { flex: 1; background: white; padding: 15px; border-radius: 16px; text-align: center; box-shadow: var(--shadow); }
.stat-card strong { display: block; font-size: 16px; margin-bottom: 4px; color: var(--primary-color); }
.stat-card span { font-size: 10px; color: var(--text-sub); }

.menu-list { background: white; border-radius: 20px; padding: 10px; box-shadow: var(--shadow); }

.benefits-section { padding: 15px; border-bottom: 1px solid #f5f5f5; }
.section-title { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 15px; }
.benefits-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.benefit-item { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; }
.benefit-item .icon-box { width: 40px; height: 40px; border-radius: 12px; background: #EEF2FF; color: var(--primary-color); display: flex; justify-content: center; align-items: center; font-size: 20px; }
.benefit-item span { font-size: 11px; font-weight: 600; color: #666; }
.benefit-item.locked { opacity: 0.5; }
.benefit-item .lock { position: absolute; top: -5px; right: 10px; font-size: 12px; color: #999; }

.invite-card { margin: 15px; padding: 20px; background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%); border-radius: 16px; border: 1px solid #FFEBEB; display: flex; justify-content: space-between; align-items: center; }
.invite-text h4 { font-size: 15px; color: #E53E3E; margin-bottom: 4px; }
.invite-text p { font-size: 11px; color: #FC8181; }
.code-box { background: white; padding: 8px 12px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; border: 1px dashed #FEB2B2; cursor: pointer; }
.code-box .label { font-size: 9px; color: #999; margin-bottom: 2px; }
.code-box .code { font-size: 16px; font-weight: 800; color: #E53E3E; font-family: monospace; }
.code-box i { font-size: 12px; color: #E53E3E; margin-top: 2px; }

.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.menu-item:last-child { border-bottom: none; }
.menu-item .left { display: flex; align-items: center; font-size: 14px; font-weight: 500; }
.menu-item .left i { font-size: 18px; margin-right: 12px; color: var(--primary-color); }
.menu-item .tag { font-size: 10px; background: #999; color: white; padding: 2px 8px; border-radius: 4px; }
.menu-item .tag.status-pending { background: #FF9500; }
.menu-item .tag.status-verified { background: var(--success-color); }
.menu-item .tag.status-rejected { background: #FF3B30; }

.logout .left i { color: #FF3B30; }
.logout .left { color: #FF3B30; }
.ri-arrow-right-s-line { color: #ccc; }

.mock-admin-btn {
  margin: 10px;
  padding: 12px;
  background: #f0f7ff;
  border: 1px dashed var(--primary-color);
  border-radius: 12px;
  color: var(--primary-color);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
}
</style>
