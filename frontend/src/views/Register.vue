<template>
  <div class="auth-container">
    <div class="auth-header">
      <div class="back-btn" @click="$router.push('/login')">
        <i class="ri-arrow-left-s-line"></i>
      </div>
      <h2>欢迎加入好帮手</h2>
      <p>开启您的优质家政新生活</p>
    </div>

    <div class="auth-form">
      <div class="role-selector">
        <div :class="['role-chip', form.roles.includes('customer') ? 'active' : '']" @click="toggleRole('customer')">
          我是客户
        </div>
        <div :class="['role-chip', form.roles.includes('worker') ? 'active' : '']" @click="toggleRole('worker')">
          我是师傅
        </div>
      </div>
      <p class="role-tip">可多选，一个身份可以既是客户也是师傅</p>

      <div class="input-group">
        <i class="ri-phone-line"></i>
        <input type="tel" v-model="form.phone" placeholder="请输入手机号" maxlength="11">
      </div>

      <div class="input-group code-group">
        <i class="ri-shield-flash-line"></i>
        <input type="text" v-model="form.code" placeholder="请输入验证码" maxlength="6">
        <button class="get-code-btn" :disabled="countdown > 0" @click="handleSendCode">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </div>

      <div class="input-group">
        <i class="ri-lock-line"></i>
        <input type="password" v-model="form.password" placeholder="设置登录密码">
      </div>

      <div class="input-group">
        <i class="ri-ticket-line"></i>
        <input type="text" v-model="form.inviteCode" placeholder="邀请码 (选填)">
      </div>

      <div v-if="errorMsg" class="error-tip">
        <i class="ri-error-warning-line"></i> {{ errorMsg }}
      </div>
      
      <button class="auth-btn" @click="handleRegister" :disabled="loading">
        {{ loading ? '注册中...' : '立即注册' }}
      </button>

      <div class="auth-footer">
        已有账号？ <span @click="$router.push('/login')">立即登录</span>
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
const countdown = ref(0)
const errorMsg = ref('')
const form = reactive({
  phone: '',
  code: '',
  password: '',
  inviteCode: '',
  roles: ['customer']
})

watch([() => form.phone, () => form.password, () => form.code], () => {
  errorMsg.value = ''
})

const toggleRole = (role) => {
  const index = form.roles.indexOf(role)
  if (index > -1) {
    if (form.roles.length > 1) form.roles.splice(index, 1)
    else errorMsg.value = '请至少选择一个身份'
  } else {
    form.roles.push(role)
  }
}

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

const handleRegister = async () => {
  if (!form.phone || !form.password) {
    errorMsg.value = '请填写手机号和登录密码'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/register', {
      phone: form.phone,
      password: form.password,
      roles: form.roles,
      inviteCode: form.inviteCode
    })
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      alert('注册成功')
      router.push('/')
    } else {
      errorMsg.value = res.data.message || '注册失败'
    }
  } catch (err) {
    if (err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = '注册失败，可能手机号已占用'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container { height: 100vh; background: white; padding: 40px 25px 30px; overflow-y: auto; box-sizing: border-box; }
.auth-header { margin-bottom: 24px; }
.auth-form { padding-bottom: 24px; }
.back-btn { width: 40px; height: 40px; border-radius: 12px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; margin-bottom: 20px; }
.auth-header h2 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: var(--text-main); }
.auth-header p { color: var(--text-sub); font-size: 15px; }

.role-selector { display: flex; gap: 10px; margin-bottom: 10px; }
.role-chip { flex: 1; text-align: center; padding: 12px; border-radius: 12px; background: #f8f9fa; color: var(--text-sub); font-weight: 600; cursor: pointer; transition: 0.3s; border: 1px solid transparent; }
.role-chip.active { background: #EEF2FF; color: var(--primary-color); border-color: var(--primary-color); }
.role-tip { font-size: 11px; color: var(--text-sub); text-align: center; margin-bottom: 20px; }

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
