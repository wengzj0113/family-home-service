<template>
  <div class="page-container">
    <div class="nav-header">
      <div class="back-btn" @click="$router.back()">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <h2>身份管理</h2>
    </div>

    <div class="content">
      <p class="desc">您可以根据需要选择开启不同的身份，开启后将可以使用对应身份的所有功能。</p>
      
      <div class="role-cards">
        <div 
          :class="['role-card', selectedRoles.includes('customer') ? 'active' : '']"
          @click="toggleRole('customer')"
        >
          <div class="icon-box">
            <i class="ri-user-heart-line"></i>
          </div>
          <div class="info">
            <h3>我是客户</h3>
            <p>发布家政需求，寻找优质师傅服务</p>
          </div>
          <div class="checkbox">
            <i :class="selectedRoles.includes('customer') ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"></i>
          </div>
        </div>

        <div 
          :class="['role-card', selectedRoles.includes('worker') ? 'active' : '']"
          @click="toggleRole('worker')"
        >
          <div class="icon-box worker">
            <i class="ri-tools-line"></i>
          </div>
          <div class="info">
            <h3>我是师傅</h3>
            <p>在线抢单接单，开启专业服务赚钱</p>
          </div>
          <div class="checkbox">
            <i :class="selectedRoles.includes('worker') ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"></i>
          </div>
        </div>
      </div>

      <div class="tip-box">
        <i class="ri-information-line"></i>
        <span>温馨提示：您可以同时拥有两种身份，通过首页顶部的切换按钮即可快速切换。</span>
      </div>

      <button class="save-btn" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存修改' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const selectedRoles = ref([])

const toggleRole = (role) => {
  const index = selectedRoles.value.indexOf(role)
  if (index > -1) {
    if (selectedRoles.value.length > 1) {
      selectedRoles.value.splice(index, 1)
    } else {
      alert('请至少保留一个身份')
    }
  } else {
    selectedRoles.value.push(role)
  }
}

const handleSave = async () => {
  loading.value = true
  try {
    const res = await api.patch('/auth/roles', { roles: selectedRoles.value })
    if (res.data.success) {
      alert('身份更新成功！')
      // 更新本地存储的 token 和 user 数据
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      }
      router.back()
    }
  } catch (err) {
    alert('保存失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    const user = JSON.parse(userData)
    selectedRoles.value = [...(user.roles || [])]
  }
})
</script>

<style scoped>
.page-container { height: 100%; background: #f8f9fa; display: flex; flex-direction: column; }
.nav-header { background: white; padding: 50px 20px 15px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; }
.back-btn { width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 10px; background: #f5f5f5; margin-right: 15px; }
.nav-header h2 { font-size: 18px; font-weight: 700; color: var(--text-main); }

.content { flex: 1; padding: 20px; }
.desc { font-size: 14px; color: #666; margin-bottom: 30px; line-height: 1.6; }

.role-cards { display: flex; flex-direction: column; gap: 15px; }
.role-card { background: white; padding: 20px; border-radius: 20px; display: flex; align-items: center; border: 2px solid transparent; transition: 0.3s; cursor: pointer; }
.role-card.active { border-color: var(--primary-color); background: #f0f4ff; }

.icon-box { width: 50px; height: 50px; border-radius: 15px; background: #EEF2FF; color: var(--primary-color); display: flex; justify-content: center; align-items: center; font-size: 24px; margin-right: 15px; }
.icon-box.worker { background: #FFF7ED; color: #FF9500; }

.info { flex: 1; }
.info h3 { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #333; }
.info p { font-size: 12px; color: #999; }

.checkbox { font-size: 22px; color: #ddd; }
.role-card.active .checkbox { color: var(--primary-color); }

.tip-box { margin-top: 25px; padding: 15px; background: #fff; border-radius: 12px; display: flex; gap: 10px; border: 1px solid #eee; }
.tip-box i { color: #FF9500; font-size: 18px; }
.tip-box span { font-size: 12px; color: #666; line-height: 1.5; }

.save-btn { width: 100%; margin-top: 40px; padding: 16px; background: var(--primary-color); color: white; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.2); }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
