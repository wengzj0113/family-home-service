<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>领券中心</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="main-content">
      <div v-if="loading" class="center-msg">加载中...</div>
      <div v-else-if="coupons.length === 0" class="empty-state">
        <i class="ri-ticket-line"></i>
        <p>暂无可领取的优惠券</p>
      </div>
      <div v-else class="coupon-list">
        <div v-for="c in coupons" :key="c.id" class="coupon-item">
          <div class="left">
            <div class="amount">
              <small>¥</small>
              <span>{{ Number(c.amount).toFixed(0) }}</span>
            </div>
            <div class="condition">满 {{ Number(c.minOrderAmount).toFixed(0) }} 可用</div>
          </div>
          <div class="right">
            <div class="info">
              <h3>{{ c.title }}</h3>
              <p>有效期至: {{ formatDate(c.expireAt) }}</p>
            </div>
            <button class="claim-btn" @click="handleClaim(c)" :disabled="claiming === c.id">
              {{ claiming === c.id ? '领取中...' : '立即领取' }}
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

const coupons = ref([])
const loading = ref(false)
const claiming = ref(null)

const fetchCoupons = async () => {
  loading.value = true
  try {
    const res = await api.get('/coupons/active')
    coupons.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleClaim = async (coupon) => {
  claiming.value = coupon.id
  try {
    await api.post('/coupons/claim', { couponId: coupon.id })
    alert('领取成功！')
  } catch (err) {
    alert(err.response?.data?.message || '领取失败')
  } finally {
    claiming.value = null
  }
}

const formatDate = (d) => new Date(d).toLocaleDateString()

onMounted(fetchCoupons)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }

.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.coupon-list { display: flex; flex-direction: column; gap: 15px; }
.coupon-item { background: white; border-radius: 16px; display: flex; overflow: hidden; box-shadow: var(--shadow); }

.left { width: 100px; background: linear-gradient(135deg, #FF5E62 0%, #FF9966 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 15px; position: relative; }
.left::after { content: ''; position: absolute; right: -5px; top: 0; bottom: 0; width: 10px; background-image: radial-gradient(circle at 10px 10px, transparent 0, transparent 5px, white 5px, white 10px); background-size: 10px 20px; }

.amount span { font-size: 32px; font-weight: 800; }
.condition { font-size: 10px; opacity: 0.9; margin-top: 4px; }

.right { flex: 1; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; }
.right h3 { font-size: 15px; margin-bottom: 4px; }
.right p { font-size: 11px; color: var(--text-sub); }

.claim-btn { align-self: flex-end; background: var(--primary-color); color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; }
.claim-btn:disabled { opacity: 0.5; }

.center-msg, .empty-state { text-align: center; padding-top: 100px; color: #ccc; }
.empty-state i { font-size: 64px; margin-bottom: 10px; display: block; }
</style>
