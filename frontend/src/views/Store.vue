<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>商城 & 积分</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="tabs">
      <div :class="['tab', activeTab === 'package' ? 'active' : '']" @click="activeTab = 'package'">超值套餐</div>
      <div :class="['tab', activeTab === 'points' ? 'active' : '']" @click="activeTab = 'points'">积分兑换</div>
    </div>

    <div class="main-content">
      <!-- 次卡套餐 -->
      <div v-if="activeTab === 'package'" class="package-list">
        <div v-for="p in packages" :key="p.id" class="package-card">
          <div class="card-left">
            <h3>{{ p.name }}</h3>
            <p>{{ p.description }}</p>
            <div class="price-box">
              <span class="price">¥{{ p.price }}</span>
              <span class="old-price">¥{{ p.times * 45 }}</span>
            </div>
          </div>
          <button class="buy-btn" @click="handleBuyPackage(p)">立即购买</button>
        </div>
      </div>

      <!-- 积分兑换 -->
      <div v-if="activeTab === 'points'" class="points-section">
        <div class="points-header">
          <div class="points-val">
            <i class="ri-coin-line"></i>
            <span>{{ userPoints }}</span>
          </div>
          <span class="label">当前可用积分</span>
        </div>

        <div class="coupon-grid">
          <div v-for="c in pointCoupons" :key="c.id" class="point-card">
            <div class="val">¥{{ c.amount }}</div>
            <div class="name">{{ c.title }}</div>
            <button class="exchange-btn" :disabled="userPoints < c.points" @click="handleExchange(c)">
              {{ c.points }} 积分兑换
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const activeTab = ref('package')
const packages = ref([])
const userPoints = ref(0)
const pointCoupons = [
  { id: 1, title: '5元通用券', amount: 5, points: 50 },
  { id: 2, title: '10元通用券', amount: 10, points: 100 },
  { id: 3, title: '20元大额券', amount: 20, points: 180 },
]

const fetchPackages = async () => {
  // 模拟从后端获取
  packages.value = [
    { id: 1, name: '日常保洁4次卡', price: 160, times: 4, description: '单次仅需40元，全城通用' },
    { id: 2, name: '日常保洁10次卡', price: 350, times: 10, description: '单次仅需35元，极致性价比' },
  ]
}

const fetchUserPoints = async () => {
  try {
    const res = await api.get('/auth/profile')
    userPoints.value = res.data.points || 0
  } catch (err) {
    console.error(err)
  }
}

const handleBuyPackage = (p) => {
  if (confirm(`确认购买 ${p.name} 吗？`)) {
    alert('购买成功！已存入您的账户。')
  }
}

const handleExchange = (c) => {
  if (confirm(`确认使用 ${c.points} 积分兑换 ${c.title} 吗？`)) {
    alert('兑换成功！优惠券已发放到您的账户。')
    userPoints.value -= c.points
  }
}

onMounted(() => {
  fetchPackages()
  fetchUserPoints()
})
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.nav-header span { font-weight: 700; font-size: 18px; }

.tabs { display: flex; background: white; padding: 10px 20px; gap: 20px; }
.tab { padding-bottom: 8px; font-size: 15px; color: #999; position: relative; }
.tab.active { color: var(--primary-color); font-weight: 700; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--primary-color); border-radius: 2px; }

.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.package-card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow); }
.card-left h3 { font-size: 16px; margin-bottom: 6px; }
.card-left p { font-size: 12px; color: #999; margin-bottom: 10px; }
.price-box { display: flex; align-items: baseline; gap: 8px; }
.price { font-size: 20px; font-weight: 700; color: #FF3B30; }
.old-price { font-size: 12px; color: #ccc; text-decoration: line-through; }
.buy-btn { background: var(--primary-color); color: white; border: none; padding: 8px 15px; border-radius: 20px; font-size: 13px; font-weight: 700; }

.points-header { background: linear-gradient(135deg, #FF9500, #FFCC00); padding: 30px; border-radius: 20px; text-align: center; color: white; margin-bottom: 20px; }
.points-val { font-size: 32px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; }
.points-val i { font-size: 28px; }
.points-header .label { font-size: 12px; opacity: 0.8; }

.coupon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.point-card { background: white; padding: 20px; border-radius: 16px; text-align: center; box-shadow: var(--shadow); }
.point-card .val { font-size: 24px; font-weight: 800; color: #FF9500; margin-bottom: 4px; }
.point-card .name { font-size: 13px; color: #666; margin-bottom: 15px; }
.exchange-btn { width: 100%; border: 1px solid #FF9500; background: white; color: #FF9500; padding: 6px; border-radius: 15px; font-size: 12px; font-weight: 600; }
.exchange-btn:disabled { border-color: #eee; color: #ccc; }
</style>
