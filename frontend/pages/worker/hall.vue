<template>
  <view class="container">
    <view class="order-list">
      <view v-for="order in orders" :key="order.id" class="order-card">
        <view class="order-header">
          <text class="type">{{ order.serviceType }}</text>
          <text class="price">￥{{ order.amount }}</text>
        </view>
        <view class="order-info">
          <text>时间：{{ order.serviceTime }}</text>
          <text>地点：{{ order.location }}</text>
        </view>
        <button class="grab-btn" @click="grab(order.id)">立即抢单</button>
      </view>
      <view v-if="orders.length === 0" class="empty">暂无待抢订单</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      orders: []
    };
  },
  onShow() {
    this.fetchOrders();
  },
  methods: {
    fetchOrders() {
      uni.request({
        url: 'http://localhost:3000/orders/pending',
        header: {
          'Authorization': 'Bearer ' + uni.getStorageSync('token')
        },
        success: (res) => {
          this.orders = res.data;
        }
      });
    },
    grab(id) {
      uni.request({
        url: `http://localhost:3000/orders/${id}/grab`,
        method: 'POST',
        header: {
          'Authorization': 'Bearer ' + uni.getStorageSync('token')
        },
        success: (res) => {
          if (res.statusCode === 201) {
            uni.showToast({ title: '抢单成功' });
            this.fetchOrders();
          } else {
            uni.showToast({ title: res.data.message || '抢单失败', icon: 'none' });
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.container { padding: 15px; }
.order-card { 
  background-color: #fff; 
  margin-bottom: 15px; 
  padding: 15px; 
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.order-header { 
  display: flex; 
  justify-content: space-between; 
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}
.type { font-weight: bold; font-size: 18px; }
.price { color: #f40; font-weight: bold; font-size: 18px; }
.order-info { color: #666; font-size: 14px; margin-bottom: 15px; line-height: 1.6; }
.order-info text { display: block; }
.grab-btn { background-color: #f80; color: #fff; border-radius: 20px; font-size: 16px; }
.empty { text-align: center; color: #999; margin-top: 50px; }
</style>
