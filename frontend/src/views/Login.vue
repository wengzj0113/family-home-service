<template>
  <div class="auth-container">
    <div class="auth-header">
      <div class="back-btn" @click="$router.push('/')">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <div class="logo-box">
        <img src="/logo.png" alt="logo">
      </div>
      <h2>欢迎使用好帮手</h2>
      <p>优质家政服务，让生活更简单</p>
    </div>

    <div class="auth-tabs">
      <div :class="['auth-tab', loginType === 'password' ? 'active' : '']" @click="loginType = 'password'">密码登录</div>
      <div :class="['auth-tab', loginType === 'sms' ? 'active' : '']" @click="loginType = 'sms'">验证码登录</div>
    </div>

    <div class="auth-form">
      <div class="input-group">
        <i class="ri-phone-line"></i>
        <input type="tel" v-model="form.phone" placeholder="请输入手机号" maxlength="11">
      </div>
      
      <!-- 密码输入框 -->
      <div v-if="loginType === 'password'" class="input-group">
        <i class="ri-lock-line"></i>
        <input type="password" v-model="form.password" placeholder="请输入密码">
      </div>

      <!-- 验证码输入框 -->
      <div v-else class="input-group code-group">
        <i class="ri-shield-flash-line"></i>
        <input type="text" v-model="form.code" placeholder="请输入验证码" maxlength="6">
        <button class="get-code-btn" :disabled="countdown > 0" @click="handleSendCode">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </div>

      <div v-if="errorMsg" class="error-tip">
        <i class="ri-error-warning-line"></i> {{ errorMsg }}
      </div>
      
      <button class="auth-btn" @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '立即登录' }}
      </button>

      <div class="auth-footer">
        还没有账号？ <span @click="$router.push('/register')">立即注册</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()
const loading = ref(false)
const loginType = ref('password') 
const countdown = ref(0)
const errorMsg = ref('')
const form = reactive({
  phone: '',
  password: '',
  code: ''
})

watch([() => form.phone, () => form.password, () => form.code, loginType], () => {
  errorMsg.value = ''
})

const handleSendCode = async () => {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    errorMsg.value = '请输入正确的手机号'
    return
  }
  try {
    const res = await api.post('/auth/send-code', { phone: form.phone })
    if (res.data.success) {
      alert(res.data.message)
      startCountdown()
    }
  } catch (err) {
    errorMsg.value = '验证码发送失败'
  }
}

const startCountdown = () => {
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const handleLogin = async () => {
  if (!form.phone) return errorMsg.value = '请输入手机号'
  if (loginType.value === 'password' && !form.password) return errorMsg.value = '请输入密码'
  if (loginType.value === 'sms' && !form.code) return errorMsg.value = '请输入验证码'

  loading.value = true
  errorMsg.value = ''
  
  try {
    const payload = { 
      phone: form.phone,
      type: loginType.value
    }
    if (loginType.value === 'password') payload.password = form.password
    else payload.code = form.code

    console.log('Attempting login...', payload)
    const res = await api.post('/auth/login', payload)
    
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      router.push('/')
    } else {
      errorMsg.value = res.data.message || '登录失败'
    }
  } catch (err) {
    console.error('Login error:', err)
    if (err.response?.status === 401 || err.response?.data?.message) {
      errorMsg.value = err.response.data.message || '手机号或密码错误'
    } else {
      errorMsg.value = '连接服务器失败，请检查网络'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container { height: 100%; background: white; padding: 60px 25px; }
.auth-header { margin-bottom: 30px; }
.logo-box { margin-bottom: 20px; }
.logo-box img { width: 64px; height: 64px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.back-btn { width: 40px; height: 40px; border-radius: 12px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; margin-bottom: 20px; }
.auth-header h2 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: var(--text-main); }
.auth-header p { color: var(--text-sub); font-size: 15px; }

.auth-tabs { display: flex; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid #f0f0f0; }
.auth-tab { padding: 10px 0; font-size: 15px; color: var(--text-sub); cursor: pointer; position: relative; }
.auth-tab.active { color: var(--primary-color); font-weight: 700; }
.auth-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: var(--primary-color); }

.input-group { background: #f8f9fa; border-radius: 16px; padding: 15px 20px; display: flex; align-items: center; margin-bottom: 15px; border: 1px solid transparent; transition: 0.3s; }
.input-group:focus-within { border-color: var(--primary-color); background: white; box-shadow: 0 4px 12px rgba(45, 90, 254, 0.1); }
.input-group i { color: var(--text-sub); margin-right: 15px; font-size: 20px; }
.input-group input { border: none; background: transparent; outline: none; flex: 1; font-size: 15px; }

.code-group { padding-right: 10px; }
.get-code-btn { background: transparent; border: none; color: var(--primary-color); font-size: 14px; font-weight: 600; cursor: pointer; padding-left: 10px; border-left: 1px solid #ddd; }
.get-code-btn:disabled { color: var(--text-sub); cursor: not-allowed; }

.error-tip { color: #FF3B30; font-size: 13px; margin: 10px 5px; display: flex; align-items: center; gap: 5px; }

.auth-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-size: 16px; font-weight: 700; margin-top: 20px; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); }
.auth-btn:disabled { opacity: 0.6; }

.auth-footer { text-align: center; margin-top: 30px; font-size: 14px; color: var(--text-sub); }
.auth-footer span { color: var(--primary-color); font-weight: 600; cursor: pointer; }
</style>
