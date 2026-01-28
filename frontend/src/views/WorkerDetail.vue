<template>
  <div class="page-container">
    <div class="nav-header" :class="{ 'scrolled': isScrolled }">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span v-if="isScrolled">{{ worker?.nickname }}</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="main-content" @scroll="handleScroll">
      <div v-if="loading" class="center-msg">加载中...</div>
      <div v-else-if="!worker" class="center-msg">未找到该师傅信息</div>
      <div v-else>
        <!-- 头部信息 -->
        <div class="worker-header">
          <div class="avatar-box">
            <img :src="getImageUrl(worker.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.nickname}`">
            <div class="level-badge">Lv.{{ worker.level || 1 }}</div>
          </div>
          <div class="basic-info">
            <h2>{{ worker.nickname }}</h2>
            <div class="tags">
              <span class="tag verify"><i class="ri-checkbox-circle-fill"></i> 已实名</span>
              <span class="tag background" v-if="worker.profile?.backgroundCheckStatus === 1">
                <i class="ri-user-search-fill"></i> 背景已审
              </span>
              <span class="tag health" v-if="worker.profile?.healthCertStatus === 1">
                <i class="ri-heart-pulse-fill"></i> 健康认证
              </span>
              <span class="tag insurance"><i class="ri-shield-check-fill"></i> 平台保障</span>
            </div>
            <div class="stats">
              <div class="stat">
                <span class="value">{{ worker.workerScore || '5.0' }}</span>
                <span class="label">评分</span>
              </div>
              <div class="stat">
                <span class="value">{{ worker.ratingCount || 0 }}</span>
                <span class="label">评价</span>
              </div>
              <div class="stat">
                <span class="value">{{ worker.profile?.experience || 0 }}年</span>
                <span class="label">从业</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 个人简介 -->
        <div class="section">
          <div class="section-title">个人简介</div>
          <p class="intro-text">{{ worker.profile?.introduction || '该师傅很懒，还没有填写简介~' }}</p>
        </div>

        <!-- 技能标签 -->
        <div class="section">
          <div class="section-title">服务技能</div>
          <div class="skill-tags">
            <span v-for="s in (worker.profile?.skills || '').split(',')" :key="s" class="skill-tag" v-show="s">
              {{ s }}
            </span>
          </div>
        </div>

        <!-- 评价列表 -->
        <div class="section">
          <div class="section-title">客户评价 ({{ worker.ratings?.length || 0 }})</div>
          <div class="rating-list">
            <div v-for="r in worker.ratings" :key="r.id" class="rating-item">
              <div class="rating-header">
                <div class="user-info">
                  <img :src="r.fromAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.fromNickname}`">
                  <span>{{ r.fromNickname }}</span>
                </div>
                <div class="score">
                  <i v-for="i in 5" :key="i" class="ri-star-fill" :class="{ 'active': i <= r.score }"></i>
                </div>
              </div>
              <p class="rating-content">{{ r.content }}</p>
              <span class="rating-date">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="bottom-bar" v-if="worker">
      <button class="chat-btn" @click="handleChat">
        <i class="ri-chat-3-line"></i> 立即沟通
      </button>
      <button class="book-btn" @click="handleBook">立即预约</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'

const route = useRoute()
const router = useRouter()
const workerId = route.params.id
const worker = ref(null)
const loading = ref(false)
const isScrolled = ref(false)

const fetchWorkerDetail = async () => {
  loading.value = true
  try {
    const res = await api.get(`/ratings/worker/${workerId}`)
    if (res.data.success) {
      worker.value = res.data.data
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleScroll = (e) => {
  isScrolled.value = e.target.scrollTop > 50
}

const handleChat = () => {
  router.push(`/chat/${workerId}?name=${worker.value.nickname}`)
}

const handleBook = () => {
  // 跳转到下单页并预选好这个师傅（逻辑待完善）
  router.push('/order/create')
}

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `http://localhost:3000${url}`;
};

onMounted(fetchWorkerDetail)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 50px 20px 15px; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; }
.nav-header.scrolled { background: white; border-bottom: 1px solid #eee; }
.nav-header i { font-size: 24px; color: #333; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 16px; }

.main-content { flex: 1; overflow-y: auto; }

.worker-header { background: white; padding: 100px 20px 30px; display: flex; gap: 20px; align-items: center; border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.avatar-box { position: relative; }
.avatar-box img { width: 80px; height: 80px; border-radius: 20px; object-fit: cover; }
.level-badge { position: absolute; bottom: -5px; right: -5px; background: #FF9500; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 2px solid white; }

.basic-info h2 { font-size: 20px; margin-bottom: 8px; }
.tags { display: flex; gap: 8px; margin-bottom: 12px; }
.tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 2px; }
.tag.verify { background: #E6FFFA; color: #38B2AC; }
.tag.background { background: #FFF5F5; color: #E53E3E; }
.tag.health { background: #F0FFF4; color: #48BB78; }
.tag.insurance { background: #EBF8FF; color: #3182CE; }

.stats { display: flex; gap: 20px; }
.stat { display: flex; flex-direction: column; }
.stat .value { font-size: 16px; font-weight: 700; color: #333; }
.stat .label { font-size: 11px; color: #999; }

.section { background: white; margin: 15px; padding: 20px; border-radius: 20px; box-shadow: var(--shadow); }
.section-title { font-size: 15px; font-weight: 700; margin-bottom: 15px; display: flex; align-items: center; }
.section-title::before { content: ''; width: 4px; height: 14px; background: var(--primary-color); border-radius: 2px; margin-right: 8px; }

.intro-text { font-size: 14px; color: #666; line-height: 1.6; }

.skill-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.skill-tag { background: #f0f2f5; color: #666; font-size: 12px; padding: 6px 15px; border-radius: 10px; }

.rating-list { display: flex; flex-direction: column; gap: 20px; }
.rating-item { padding-bottom: 15px; border-bottom: 1px solid #f5f5f5; }
.rating-item:last-child { border-bottom: none; }
.rating-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.user-info { display: flex; align-items: center; gap: 8px; }
.user-info img { width: 24px; height: 24px; border-radius: 50%; }
.user-info span { font-size: 13px; color: #333; }
.score i { font-size: 12px; color: #ddd; }
.score i.active { color: #FF9500; }
.rating-content { font-size: 13px; color: #666; margin-bottom: 6px; }
.rating-date { font-size: 11px; color: #ccc; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 15px 20px 35px; display: flex; gap: 12px; border-top: 1px solid #eee; }
.chat-btn { flex: 1; height: 48px; border-radius: 24px; border: 1px solid #eee; background: white; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.book-btn { flex: 1.5; height: 48px; border-radius: 24px; background: var(--primary-color); color: white; border: none; font-weight: 700; font-size: 16px; box-shadow: 0 8px 15px rgba(45, 90, 254, 0.2); }

.center-msg { text-align: center; padding-top: 100px; color: #999; }
</style>
