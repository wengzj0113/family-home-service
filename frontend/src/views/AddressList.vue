<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>地址管理</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="main-content">
      <div v-if="loading" class="center-msg">加载中...</div>
      <div v-else-if="addresses.length === 0" class="empty-state">
        <i class="ri-map-pin-line"></i>
        <p>您还没有保存的地址</p>
      </div>
      <div v-else class="address-list">
        <div v-for="addr in addresses" :key="addr.id" class="address-item" @click="handleSelect(addr)">
          <div class="left">
            <div class="info">
              <span class="name">{{ addr.name }}</span>
              <span class="phone">{{ maskPhone(addr.phone) }}</span>
              <span v-if="addr.isDefault" class="default-tag">默认</span>
            </div>
            <p class="location">{{ addr.location }} {{ addr.addressDetail }}</p>
          </div>
          <div class="right" @click.stop="editAddress(addr.id)">
            <i class="ri-edit-line"></i>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="add-btn" @click="$router.push('/address/edit')">
        <i class="ri-add-line"></i> 新增服务地址
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'

const router = useRouter()
const route = useRoute()
const addresses = ref([])
const loading = ref(false)

const isSelecting = route.query.mode === 'select'

const fetchAddresses = async () => {
  loading.value = true
  try {
    const res = await api.get('/addresses')
    addresses.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const maskPhone = (p) => p.replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2')

const editAddress = (id) => {
  router.push(`/address/edit/${id}`)
}

const handleSelect = (addr) => {
  if (isSelecting) {
    // 如果是从下单页进入的选择模式
    localStorage.setItem('selected_address', JSON.stringify(addr))
    router.back()
  }
}

onMounted(fetchAddresses)
</script>

<style scoped>
.page-container { background: #f8f9fa; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; background: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; flex-shrink: 0; }
.nav-header span { font-weight: 700; font-size: 18px; }

.main-content { flex: 1; overflow-y: auto; padding: 15px; }

.address-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }
.address-item { background: white; padding: 15px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow); }
.address-item:active { transform: scale(0.98); }

.info { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.name { font-weight: 700; font-size: 15px; }
.phone { color: var(--text-sub); font-size: 13px; }
.default-tag { background: #EEF2FF; color: var(--primary-color); font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }

.location { font-size: 13px; color: var(--text-main); line-height: 1.4; }

.right { padding: 10px; color: #ccc; cursor: pointer; }
.right i { font-size: 20px; }

.empty-state { text-align: center; padding-top: 100px; color: #ccc; }
.empty-state i { font-size: 64px; margin-bottom: 10px; display: block; }

.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20px; background: white; border-top: 1px solid #eee; }
.add-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; display: flex; justify-content: center; align-items: center; gap: 8px; }
</style>
