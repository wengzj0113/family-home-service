<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>{{ isEdit ? '编辑地址' : '新增地址' }}</span>
      <div class="delete-btn" v-if="isEdit" @click="handleDelete">删除</div>
      <div v-else style="width: 40px;"></div>
    </div>

    <div class="main-content">
      <div class="form-card">
        <div class="input-group">
          <label>联系人</label>
          <input type="text" v-model="form.name" placeholder="姓名">
        </div>
        <div class="input-group">
          <label>手机号</label>
          <input type="tel" v-model="form.phone" placeholder="联系电话" maxlength="11">
        </div>
        <div class="input-group">
          <label>所在城市</label>
          <div class="city-inputs">
            <input type="text" v-model="form.province" placeholder="省">
            <input type="text" v-model="form.city" placeholder="市">
            <input type="text" v-model="form.district" placeholder="区">
          </div>
        </div>
        <div class="input-group">
          <label>详细地址</label>
          <div class="location-picker" @click="$router.push('/map-picker')">
            <input type="text" v-model="form.location" placeholder="地图选点 / 街道 / 建筑" readonly>
            <i class="ri-map-pin-range-line"></i>
          </div>
        </div>
        <div class="input-group">
          <label>门牌号</label>
          <input type="text" v-model="form.addressDetail" placeholder="例：5号楼201室">
        </div>
        <div class="switch-group">
          <span>设为默认地址</span>
          <div :class="['switch', form.isDefault ? 'on' : '']" @click="form.isDefault = !form.isDefault">
            <div class="handle"></div>
          </div>
        </div>
      </div>

      <button class="save-btn" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存地址' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'
import { getCurrentLocation, getAddressFromCoords } from '../utils/location'

const router = useRouter()
const route = useRoute()
const isEdit = !!route.params.id
const loading = ref(false)

const form = reactive({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  location: '',
  addressDetail: '',
  lat: null,
  lng: null,
  isDefault: false
})

const fetchAddress = async () => {
  if (!isEdit) return
  try {
    const res = await api.get(`/addresses/${route.params.id}`)
    Object.assign(form, res.data)
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchAddress()
  
  // 处理从地图选点返回的数据
  const picked = localStorage.getItem('picked_location')
  if (picked) {
    const data = JSON.parse(picked)
    form.location = data.name
    form.lat = data.lat
    form.lng = data.lng
    // 简单解析省市区（生产环境应由地图组件返回）
    form.province = '上海市'
    form.city = '上海市'
    form.district = '浦东新区'
    localStorage.removeItem('picked_location')
  }

  // 处理从下单页带过来的定位数据
  if (route.query.location) {
    form.location = route.query.location
    form.lat = route.query.lat ? Number(route.query.lat) : null
    form.lng = route.query.lng ? Number(route.query.lng) : null
    // 默认城市信息
    form.province = '上海市'
    form.city = '上海市'
    form.district = '浦东新区'
  }
})

const handleGetLocation = async () => {
  try {
    const loc = await getCurrentLocation()
    form.lat = loc.lat
    form.lng = loc.lng
    const addr = await getAddressFromCoords(loc.lat, loc.lng)
    form.location = addr
    // 模拟自动填写省市区
    form.province = '上海市'
    form.city = '上海市'
    form.district = '浦东新区'
  } catch (err) {
    alert('获取位置失败')
  }
}

const handleSave = async () => {
  if (!form.name || !form.phone || !form.location) {
    alert('请填写完整信息')
    return
  }
  loading.value = true
  try {
    if (isEdit) {
      await api.patch(`/addresses/${route.params.id}`, form)
    } else {
      await api.post('/addresses', form)
    }
    router.back()
  } catch (err) {
    alert('保存失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('确认删除该地址吗？')) return
  try {
    await api.delete(`/addresses/${route.params.id}`)
    router.back()
  } catch (err) {
    alert('删除失败')
  }
}

onMounted(() => {
  fetchAddress()
  // 处理从下单页带过来的定位数据
  if (route.query.location) {
    form.location = route.query.location
    form.lat = route.query.lat ? Number(route.query.lat) : null
    form.lng = route.query.lng ? Number(route.query.lng) : null
    // 默认城市信息
    form.province = '上海市'
    form.city = '上海市'
    form.district = '浦东新区'
  }
})
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }
.delete-btn { color: #FF3B30; font-size: 14px; font-weight: 500; cursor: pointer; }

.main-content { flex: 1; padding: 20px; overflow-y: auto; }

.form-card { background: white; border-radius: 20px; padding: 20px; box-shadow: var(--shadow); margin-bottom: 30px; }

.input-group { margin-bottom: 20px; }
.input-group label { display: block; font-size: 13px; color: var(--text-sub); margin-bottom: 8px; font-weight: 600; }
.input-group input { width: 100%; border: none; background: #f8f9fa; padding: 12px 15px; border-radius: 12px; font-size: 14px; outline: none; }

.city-inputs { display: flex; gap: 8px; }
.location-picker { display: flex; align-items: center; background: #f8f9fa; border-radius: 12px; padding-right: 10px; }
.location-picker input { flex: 1; }
.location-picker i { font-size: 20px; color: var(--primary-color); cursor: pointer; }

.switch-group { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #f5f5f5; }
.switch-group span { font-size: 14px; font-weight: 600; }

.switch { width: 44px; height: 24px; background: #eee; border-radius: 12px; padding: 2px; cursor: pointer; transition: 0.3s; }
.switch.on { background: var(--success-color); }
.switch .handle { width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.switch.on .handle { transform: translateX(20px); }

.save-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); }
.save-btn:disabled { opacity: 0.6; }
</style>
