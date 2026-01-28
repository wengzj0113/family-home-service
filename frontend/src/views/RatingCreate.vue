<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>评价订单</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="rating-content" v-if="order">
      <div class="order-brief">
        <div class="icon-box"><i class="ri-calendar-check-line"></i></div>
        <div class="info">
          <h3>{{ order.serviceType }}</h3>
          <p>{{ formatTime(order.serviceTime) }}</p>
        </div>
      </div>

      <div class="rating-card">
        <p class="label">您对本次服务的满意度？</p>
        <div class="stars">
          <i 
            v-for="i in 5" 
            :key="i" 
            :class="i <= form.score ? 'ri-star-fill' : 'ri-star-line'"
            @click="form.score = i"
          ></i>
        </div>
        <div class="score-text">{{ scoreTexts[form.score - 1] }}</div>

        <textarea 
          v-model="form.content" 
          placeholder="分享您的服务体验，帮助其他小伙伴参考（可选）"
        ></textarea>
      </div>

      <button class="submit-btn" @click="handleSubmit" :disabled="loading">
        {{ loading ? '提交中...' : (route.query.action === 'complete' ? '确认完成并提交评分' : '提交评价') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const order = ref(null);

const scoreTexts = ['非常差', '一般', '不错', '很满意', '非常完美'];

const form = reactive({
  orderId: Number(route.params.id),
  score: 5,
  content: ''
});

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
};

const fetchOrder = async () => {
  try {
    // We can use getMyOrders and filter, or add a getOrderById endpoint
    // For simplicity, let's fetch from profile/orders or just rely on passed ID
    const res = await api.get('/orders/my');
    order.value = res.data.find(o => o.id === Number(route.params.id));
    if (!order.value) {
      alert('订单不存在');
      router.back();
    }
  } catch (err) {
    console.error(err);
  }
};

const handleSubmit = async () => {
  loading.value = true;
  try {
    if (route.query.action === 'complete') {
      // 师傅完成订单并评价
      await api.patch(`/orders/${form.orderId}/complete`, form);
      alert('订单已确认完成，评分已提交！');
    } else {
      // 普通评价
      await api.post('/ratings', form);
      alert('评价成功，感谢您的分享！');
    }
    router.push('/orders');
  } catch (error) {
    alert(error.response?.data?.message || '提交失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchOrder);
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 10px; display: flex; justify-content: space-between; align-items: center; background: white; }
.nav-header i { font-size: 24px; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 18px; }

.rating-content { padding: 20px; }

.order-brief { background: white; padding: 15px; border-radius: 16px; display: flex; align-items: center; gap: 15px; margin-bottom: 20px; box-shadow: var(--shadow); }
.icon-box { width: 44px; height: 44px; background: #EEF2FF; color: var(--primary-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.order-brief h3 { font-size: 16px; margin-bottom: 4px; }
.order-brief p { font-size: 12px; color: var(--text-sub); }

.rating-card { background: white; padding: 30px 20px; border-radius: 20px; text-align: center; box-shadow: var(--shadow); }
.rating-card .label { font-weight: 600; margin-bottom: 20px; }

.stars { display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; }
.stars i { font-size: 32px; color: #FF9500; cursor: pointer; }
.score-text { font-size: 14px; color: #FF9500; font-weight: 700; margin-bottom: 25px; }

textarea { width: 100%; height: 120px; background: #f8f9fa; border: none; padding: 15px; border-radius: 12px; font-size: 14px; outline: none; resize: none; }

.submit-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; margin-top: 30px; cursor: pointer; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); }
</style>
