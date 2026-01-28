<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>我的优惠券</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="main-content">
      <div v-if="loading" class="center-msg">加载中...</div>
      <div v-else-if="coupons.length === 0" class="empty-state">
        <i class="ri-ticket-2-line"></i>
        <p>您还没有优惠券</p>
        <button class="go-claim" @click="$router.push('/coupons')">去领券中心</button>
      </div>
      <div v-else class="coupon-list">
        <div v-for="uc in coupons" :key="uc.id" :class="['coupon-item', uc.status === 1 ? 'used' : '']" @click="handleSelect(uc)">
          <div class="left">
            <div class="amount">
              <small>¥</small>
              <span>{{ Number(uc.coupon.amount).toFixed(0) }}</span>
            </div>
            <div class="condition">满 {{ Number(uc.coupon.minOrderAmount).toFixed(0) }} 可用</div>
          </div>
          <div class="right">
            <div class="info">
              <h3>{{ uc.coupon.title }}</h3>
              <p>有效期至: {{ formatDate(uc.coupon.expireAt) }}</p>
            </div>
            <div class="status-tag" v-if="uc.status === 1">已使用</div>
            <div class="status-tag unused" v-else>未使用</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'

const router = useRouter()
const route = useRoute()
const coupons = ref([])
const loading = ref(false)

const isSelecting = route.query.mode === 'select'
const minAmount = Number(route.query.minAmount || 0)

const fetchMyCoupons = async () => {
  loading.value = true
  try {
    const res = await api.get('/coupons/my')
    coupons.value = res.data
    
    if (isSelecting) {
      // 过滤出当前订单可用的券
      coupons.value = coupons.value.filter(uc => 
        uc.status === 0 && 
        new Date(uc.coupon.expireAt) > new Date() &&
        minAmount >= Number(uc.coupon.minOrderAmount)
      )
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSelect = (uc) => {
  if (isSelecting) {
    localStorage.setItem('selected_coupon', JSON.stringify(uc))
    router.back()
  }
}

const formatDate = (d) => new Date(d).toLocaleDateString()

onMounted(fetchMyCoupons)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }

.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.coupon-list { display: flex; flex-direction: column; gap: 15px; }
.coupon-item { background: white; border-radius: 16px; display: flex; overflow: hidden; box-shadow: var(--shadow); position: relative; }
.coupon-item.used { opacity: 0.6; grayscale: 1; }

.left { width: 100px; background: linear-gradient(135deg, #2D5AFE 0%, #6485FF 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 15px; position: relative; }
.left::after { content: ''; position: absolute; right: -5px; top: 0; bottom: 0; width: 10px; background-image: radial-gradient(circle at 10px 10px, transparent 0, transparent 5px, white 5px, white 10px); background-size: 10px 20px; }

.amount span { font-size: 32px; font-weight: 800; }
.condition { font-size: 10px; opacity: 0.9; margin-top: 4px; }

.right { flex: 1; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; }
.right h3 { font-size: 15px; margin-bottom: 4px; }
.right p { font-size: 11px; color: var(--text-sub); }

.status-tag { align-self: flex-end; font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #eee; color: #999; }
.status-tag.unused { background: #FFF7ED; color: #FF9500; border: 1px solid #FFEDD5; }

.go-claim { margin-top: 20px; background: var(--primary-color); color: white; border: none; padding: 10px 24px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; }

.center-msg, .empty-state { text-align: center; padding-top: 100px; color: #ccc; }
.empty-state i { font-size: 64px; margin-bottom: 10px; display: block; }
</style>
