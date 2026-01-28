<template>
  <view class="container">
    <view class="header">
      <text class="title">欢迎使用家政服务</text>
    </view>
    <view class="service-grid">
      <view class="service-item" @click="goToCreate('日常保洁')">
        <image class="icon" src="/static/clean.png"></image>
        <text>日常保洁</text>
      </view>
      <view class="service-item" @click="goToCreate('深度清洁')">
        <image class="icon" src="/static/deep-clean.png"></image>
        <text>深度清洁</text>
      </view>
      <view class="service-item" @click="goToCreate('家电清洗')">
        <image class="icon" src="/static/appliance.png"></image>
        <text>家电清洗</text>
      </view>
      <view class="service-item" @click="goToCreate('搬家服务')">
        <image class="icon" src="/static/move.png"></image>
        <text>搬家服务</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goToCreate(type) {
      uni.navigateTo({
        url: `/pages/order/create?type=${type}`
      });
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
}
.header {
  margin-bottom: 30px;
}
.title {
  font-size: 24px;
  font-weight: bold;
}
.service-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.service-item {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.icon {
  width: 50px;
  height: 50px;
  margin-bottom: 10px;
}
</style>
