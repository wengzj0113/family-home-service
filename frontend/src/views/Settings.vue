<template>
  <div class="page-container">
    <div class="nav-header">
      <div class="back-btn" @click="$router.back()">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <h2>设置</h2>
    </div>

    <div class="content">
      <div class="section">
        <h3 class="section-title">个人信息</h3>
        <div class="menu-list">
          <div class="menu-item" @click="handleEdit('avatar')">
            <span>修改头像</span>
            <div class="right">
              <img :src="user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.phone}`" class="small-avatar">
              <i class="ri-arrow-right-s-line"></i>
            </div>
          </div>
          <div class="menu-item" @click="handleEdit('nickname')">
            <span>修改昵称</span>
            <div class="right">
              <span class="value">{{ user?.nickname || '未设置' }}</span>
              <i class="ri-arrow-right-s-line"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">账户安全</h3>
        <div class="menu-list">
          <div class="menu-item" @click="handleEdit('password')">
            <span>修改登录密码</span>
            <i class="ri-arrow-right-s-line"></i>
          </div>
          <div class="menu-item" @click="handleEdit('phone')">
            <span>更换手机号</span>
            <div class="right">
              <span class="value">{{ maskPhone(user?.phone) }}</span>
              <i class="ri-arrow-right-s-line"></i>
            </div>
          </div>
          <div class="menu-item" @click="handleEdit('roles')">
            <span>身份管理</span>
            <div class="right">
              <span class="value">{{ user?.roles?.length > 1 ? '多重身份' : (user?.roles?.[0] === 'worker' ? '师傅' : '客户') }}</span>
              <i class="ri-arrow-right-s-line"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">其他</h3>
        <div class="menu-list">
          <div class="menu-item" @click="alert('清除缓存成功')">
            <span>清除缓存</span>
            <span class="value">12.5 MB</span>
          </div>
          <div class="menu-item" @click="alert('当前已是最新版本')">
            <span>检查更新</span>
            <span class="value">v1.0.2</span>
          </div>
          <div class="menu-item" @click="alert('关于好帮手')">
            <span>关于我们</span>
            <i class="ri-arrow-right-s-line"></i>
          </div>
        </div>
      </div>

      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2')
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const handleEdit = (type) => {
  if (type === 'roles') {
    router.push('/role-manage')
    return
  }
  alert(`${type} 修改功能正在开发中`)
}

const alert = (msg) => window.alert(msg)

onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    user.value = JSON.parse(userData)
  }
})
</script>

<style scoped>
.page-container { height: 100%; background: #f8f9fa; display: flex; flex-direction: column; }
.nav-header { background: white; padding: 50px 20px 15px; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; }
.back-btn { width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; border-radius: 10px; background: #f5f5f5; margin-right: 15px; }
.nav-header h2 { font-size: 18px; font-weight: 700; color: var(--text-main); }

.content { flex: 1; overflow-y: auto; padding: 20px; }
.section { margin-bottom: 25px; }
.section-title { font-size: 13px; color: #999; margin-bottom: 10px; margin-left: 5px; }

.menu-list { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f8f9fa; cursor: pointer; transition: 0.2s; }
.menu-item:active { background: #fafafa; }
.menu-item:last-child { border-bottom: none; }
.menu-item span { font-size: 15px; color: #333; }
.menu-item .right { display: flex; align-items: center; gap: 10px; }
.menu-item .value { font-size: 14px; color: #999; }
.menu-item i { color: #ccc; font-size: 18px; }

.small-avatar { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; }

.logout-btn { width: 100%; margin-top: 10px; padding: 16px; background: white; color: #FF3B30; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 59, 48, 0.05); }
.logout-btn:active { background: #fff5f5; }
</style>
