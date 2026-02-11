<template>
  <div id="iphone-x">
    <div class="notch"></div>
    <div class="status-bar">
      <span>12:00</span>
      <div style="display: flex; gap: 5px;">
        <i class="ri-signal-tower-fill"></i>
        <i class="ri-wifi-line"></i>
        <i class="ri-battery-2-charge-line"></i>
      </div>
    </div>

    <!-- 路由展示区 - 移除过渡动画以确保在所有浏览器中显示 -->
    <div class="router-content">
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="$route.fullPath" />
      </router-view>
    </div>

    <!-- 底部 TabBar -->
    <div v-if="!hideTabBar" class="tab-bar">
      <router-link to="/" class="tab-item" active-class="active">
        <i class="ri-home-5-line"></i>
        <span>首页</span>
      </router-link>
      <router-link to="/orders" class="tab-item" active-class="active">
        <i class="ri-file-list-2-line"></i>
        <span>订单</span>
      </router-link>
      <router-link to="/messages" class="tab-item" active-class="active">
        <div class="icon-wrapper">
          <i class="ri-chat-3-line"></i>
          <div v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</div>
        </div>
        <span>消息</span>
      </router-link>
      <router-link to="/profile" class="tab-item" active-class="active">
        <i class="ri-user-6-line"></i>
        <span>我的</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from './api'

const unreadCount = ref(0)
let timer = null
const route = useRoute()
const hideTabBarRoutes = ['/login', '/register']
const hideTabBar = computed(() => hideTabBarRoutes.includes(route.path))

const fetchUnreadCount = async () => {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await api.get('/notifications/unread-count')
    unreadCount.value = res.data.count
  } catch (err) {
    console.error('Failed to fetch unread count')
  }
}

onMounted(() => {
  fetchUnreadCount()
  // 每 30 秒轮询一次消息
  timer = setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style>
:root {
  --primary-color: #2D5AFE;
  --secondary-color: #FF9500;
  --success-color: #34C759;
  --bg-color: #F2F5F9;
  --card-bg: #FFFFFF;
  --text-main: #1A1C1E;
  --text-sub: #8E8E93;
  --shadow: 0 8px 24px rgba(149, 157, 165, 0.1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #E0E5EC; font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

#iphone-x {
  width: 375px;
  height: 812px;
  background: var(--bg-color);
  border: 12px solid #1f1f1f;
  border-radius: 40px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 50px 100px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
}

.notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 160px; height: 30px; background: #1f1f1f; border-bottom-left-radius: 18px; border-bottom-right-radius: 18px; z-index: 100; }
.status-bar { height: 44px; padding: 0 30px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 14px; font-weight: 600; z-index: 100; flex-shrink: 0; }

.router-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  height: 85px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
  border-top: 1px solid rgba(0,0,0,0.05);
  flex-shrink: 0;
  z-index: 100;
}
.tab-item { text-align: center; color: var(--text-sub); text-decoration: none; flex: 1; cursor: pointer; }
.tab-item i { font-size: 22px; display: block; margin: 0 auto 4px; }
.tab-item span { font-size: 10px; font-weight: 600; display: block; }

.icon-wrapper { position: relative; display: block; width: fit-content; margin: 0 auto; }
.badge {
  position: absolute;
  top: -2px;
  right: -8px;
  background: #FF3B30;
  color: white;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 4px;
  border: 2px solid white;
  line-height: 1;
  font-weight: 700;
}
</style>
