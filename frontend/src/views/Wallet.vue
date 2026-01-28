<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>我的钱包</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="wallet-card">
      <span class="label">当前余额 (元)</span>
      <h2 class="balance">{{ balance.toFixed(2) }}</h2>
      <div class="actions">
        <button class="action-btn outline" @click="handleWithdraw">提现</button>
        <button class="action-btn" @click="handleRecharge">充值</button>
      </div>
    </div>

    <div class="transaction-history">
      <div class="section-title">收支明细</div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="transactions.length === 0" class="empty">暂无收支记录</div>
      <div v-else class="list">
        <div class="item" v-for="t in transactions" :key="t.id">
          <div class="left">
            <div :class="['icon', t.type]">
              <i :class="getTypeIcon(t.type)"></i>
            </div>
            <div class="info">
              <span class="type">{{ getTypeText(t.type) }}</span>
              <span class="time">{{ formatTime(t.createdAt) }}</span>
            </div>
          </div>
          <div :class="['amount', t.amount > 0 ? 'plus' : 'minus']">
            {{ t.amount > 0 ? '+' : '' }}{{ t.amount.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const balance = ref(0)
const transactions = ref([])
const loading = ref(false)

const getTypeIcon = (type) => {
  const icons = {
    income: 'ri-add-circle-line',
    payment: 'ri-indeterminate-circle-line',
    commission: 'ri-percent-line',
    withdrawal: 'ri-bank-card-line'
  }
  return icons[type] || 'ri-money-cny-circle-line'
}

const getTypeText = (type) => {
  const texts = {
    income: '服务收入',
    payment: '支付费用',
    commission: '平台抽佣',
    withdrawal: '余额提现'
  }
  return texts[type] || '其他'
}

const formatTime = (t) => new Date(t).toLocaleString()

const fetchWalletData = async () => {
  loading.value = true
  try {
    const res = await api.get('/auth/profile')
    balance.value = Number(res.data.balance || 0)
    
    const transRes = await api.get('/transactions/my')
    transactions.value = transRes.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleWithdraw = () => {
  router.push('/withdraw')
}
const handleRecharge = () => alert('充值功能对接中')

onMounted(fetchWalletData)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100%; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #eee; }
.nav-header i { font-size: 24px; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 18px; }

.wallet-card { background: linear-gradient(135deg, #2D5AFE 0%, #6485FF 100%); margin: 20px; padding: 25px; border-radius: 24px; color: white; box-shadow: 0 10px 20px rgba(45, 90, 254, 0.2); }
.wallet-card .label { font-size: 14px; opacity: 0.8; }
.wallet-card .balance { font-size: 36px; margin: 10px 0 20px; font-weight: 800; }
.actions { display: flex; gap: 15px; }
.action-btn { flex: 1; padding: 10px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; transition: 0.3s; }
.action-btn { background: white; color: var(--primary-color); }
.action-btn.outline { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; }

.transaction-history { flex: 1; background: white; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 25px; overflow-y: auto; }
.section-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; }

.list { display: flex; flex-direction: column; gap: 20px; }
.item { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; align-items: center; gap: 15px; }
.icon { width: 40px; height: 40px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 20px; }
.icon.income { background: #f0fff4; color: #34C759; }
.icon.payment { background: #fff5f5; color: #FF3B30; }
.icon.commission { background: #fffaf0; color: #FF9500; }
.icon.withdrawal { background: #f0f4ff; color: #2D5AFE; }

.info { display: flex; flex-direction: column; gap: 4px; }
.info .type { font-size: 14px; font-weight: 600; }
.info .time { font-size: 11px; color: #999; }

.amount { font-size: 16px; font-weight: 700; }
.amount.plus { color: #34C759; }
.amount.minus { color: #333; }

.loading, .empty { text-align: center; padding: 40px; color: #999; font-size: 14px; }
</style>
