<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>申请提现</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="withdraw-content">
      <div class="balance-card">
        <span>可提现余额</span>
        <h2>¥ {{ balance.toFixed(2) }}</h2>
      </div>

      <div class="form-card">
        <div class="input-group">
          <label>提现金额</label>
          <div class="amount-input">
            <span class="symbol">¥</span>
            <input type="number" v-model="form.amount" placeholder="0.00" />
            <span class="all-btn" @click="form.amount = balance">全部</span>
          </div>
        </div>

        <div class="method-group">
          <label>提现方式</label>
          <div class="methods">
            <div 
              v-for="m in methods" 
              :key="m.id" 
              :class="['method-item', form.method === m.id ? 'active' : '']"
              @click="form.method = m.id"
            >
              <i :class="m.icon"></i>
              <span>{{ m.name }}</span>
            </div>
          </div>
        </div>

        <div class="input-group">
          <label>账号信息</label>
          <input type="text" v-model="form.accountInfo" placeholder="请输入您的收款账号/姓名" />
        </div>

        <p class="notice">预计 1-3 个工作日内到账</p>

        <button class="submit-btn" @click="handleSubmit" :disabled="loading || !form.amount">
          {{ loading ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const balance = ref(0);
const loading = ref(false);

const methods = [
  { id: 'wechat', name: '微信', icon: 'ri-wechat-pay-fill' },
  { id: 'alipay', name: '支付宝', icon: 'ri-alipay-fill' },
  { id: 'bank', name: '银行卡', icon: 'ri-bank-card-fill' }
];

const form = reactive({
  amount: '',
  method: 'wechat',
  accountInfo: ''
});

const fetchBalance = async () => {
  try {
    const res = await api.get('/auth/profile');
    balance.value = Number(res.data.balance || 0);
  } catch (err) {
    console.error(err);
  }
};

const handleSubmit = async () => {
  if (Number(form.amount) > balance.value) {
    alert('提现金额不能大于可用余额');
    return;
  }
  if (!form.accountInfo) {
    alert('请填写账号信息');
    return;
  }

  loading.value = true;
  try {
    await api.post('/withdrawals', form);
    alert('申请已提交，请耐心等待审核');
    router.back();
  } catch (error) {
    alert(error.response?.data?.message || '提交失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchBalance);
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.nav-header { padding: 50px 20px 10px; display: flex; justify-content: space-between; align-items: center; background: white; flex-shrink: 0; }
.nav-header i { font-size: 24px; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 18px; }

.withdraw-content { padding: 20px; flex: 1; overflow-y: auto; padding-bottom: 100px; /* 留出底部导航栏的空间 */ }

.balance-card { background: linear-gradient(135deg, #2D5AFE 0%, #6485FF 100%); padding: 25px; border-radius: 20px; color: white; margin-bottom: 20px; }
.balance-card span { font-size: 13px; opacity: 0.9; }
.balance-card h2 { font-size: 32px; margin-top: 8px; }

.form-card { background: white; padding: 20px; border-radius: 20px; box-shadow: var(--shadow); }

.input-group { margin-bottom: 25px; }
.input-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.input-group input { width: 100%; border: none; background: #f8f9fa; padding: 15px; border-radius: 12px; font-size: 14px; outline: none; }

.amount-input { display: flex; align-items: center; background: #f8f9fa; padding: 0 15px; border-radius: 12px; }
.amount-input .symbol { font-size: 24px; font-weight: 700; margin-right: 10px; }
.amount-input input { background: transparent; padding: 15px 0; flex: 1; font-size: 24px; font-weight: 700; }
.amount-input .all-btn { color: var(--primary-color); font-weight: 600; font-size: 14px; padding: 10px; cursor: pointer; }

.method-group { margin-bottom: 25px; }
.method-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.method-item { background: #f8f9fa; padding: 12px; border-radius: 12px; text-align: center; border: 2px solid transparent; transition: 0.3s; cursor: pointer; }
.method-item i { font-size: 20px; display: block; margin-bottom: 4px; color: var(--text-sub); }
.method-item span { font-size: 12px; }
.method-item.active { border-color: var(--primary-color); background: #EEF2FF; }
.method-item.active i, .method-item.active span { color: var(--primary-color); }

.notice { font-size: 12px; color: var(--text-sub); text-align: center; margin-bottom: 25px; }

.submit-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); }
.submit-btn:disabled { opacity: 0.6; }
</style>
