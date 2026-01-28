<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>地图选点</span>
      <button class="confirm-btn" @click="handleConfirm">确定</button>
    </div>

    <div class="map-container" id="amap-container">
      <div v-if="loading" class="loading-overlay">
        <i class="ri-loader-4-line spin"></i>
        <span>地图加载中...</span>
      </div>
      <div v-if="error" class="error-overlay">
        <i class="ri-error-warning-line"></i>
        <span>{{ error }}</span>
        <button @click="initMap">重试</button>
      </div>
      <!-- 地图中心图钉 -->
      <div class="center-marker" v-if="!loading && !error">
        <i class="ri-map-pin-2-fill"></i>
      </div>
    </div>

    <div class="poi-list" v-if="!loading && !error">
      <div class="search-bar">
        <i class="ri-search-line"></i>
        <input type="text" v-model="searchKeyword" placeholder="搜索地点" @input="handleSearch">
      </div>
      <div class="list-content">
        <div v-if="searching" class="list-msg">搜索中...</div>
        <div 
          v-for="(item, index) in poiList" 
          :key="index" 
          class="poi-item"
          :class="{ active: selectedIndex === index }"
          @click="selectPoi(index)"
        >
          <div class="poi-info">
            <span class="poi-name">{{ item.name }}</span>
            <span class="poi-address">{{ item.address }}</span>
          </div>
          <i v-if="selectedIndex === index" class="ri-checkbox-circle-fill"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const searchKeyword = ref('')
const searching = ref(false)
const poiList = ref([])
const selectedIndex = ref(0)

let map = null
let geocoder = null
let autoComplete = null
let placeSearch = null

const initMap = () => {
  loading.value = true
  error.value = null

  // 检查全局 AMap 对象是否已加载
  if (window.AMap) {
    setupMap()
    return
  }

  // 动态加载高德地图脚本
  // 注意：实际项目中应将 key 放入 .env
  const key = '7e3b1c1c1c1c1c1c1c1c1c1c1c1c1c1c' // 这是一个占位符 Key
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geocoder,AMap.Autocomplete,AMap.PlaceSearch`
  script.onerror = () => {
    loading.value = false
    error.value = '地图加载失败，请检查网络或配置'
    mockMapBehavior() // 演示环境：如果加载失败则开启模拟模式
  }
  script.onload = () => {
    setupMap()
  }
  document.head.appendChild(script)
}

const setupMap = () => {
  try {
    map = new window.AMap.Map('amap-container', {
      zoom: 15,
      center: [121.4737, 31.2304], // 默认上海
    })

    geocoder = new window.AMap.Geocoder()
    autoComplete = new window.AMap.Autocomplete()
    placeSearch = new window.AMap.PlaceSearch({
      map: map,
    })

    map.on('complete', () => {
      loading.value = false
      updatePoiList()
    })

    map.on('moveend', () => {
      updatePoiList()
    })
  } catch (err) {
    error.value = '地图初始化失败'
    loading.value = false
    mockMapBehavior()
  }
}

const updatePoiList = () => {
  if (!map || !geocoder) return
  const center = map.getCenter()
  
  geocoder.getAddress(center, (status, result) => {
    if (status === 'complete' && result.regeocode) {
      const address = result.regeocode.formattedAddress
      const pois = result.regeocode.pois || []
      poiList.value = [
        { name: '[当前位置]', address: address, location: center },
        ...pois.map(p => ({ name: p.name, address: p.address, location: p.location }))
      ]
      selectedIndex.value = 0
    }
  })
}

const handleSearch = () => {
  if (!searchKeyword.value) {
    updatePoiList()
    return
  }
  
  if (placeSearch) {
    placeSearch.search(searchKeyword.value, (status, result) => {
      if (status === 'complete' && result.poiList) {
        poiList.value = result.poiList.pois.map(p => ({
          name: p.name,
          address: p.address,
          location: p.location
        }))
        selectedIndex.value = 0
      }
    })
  } else {
    // 模拟搜索
    mockSearch()
  }
}

const selectPoi = (index) => {
  selectedIndex.value = index
  const poi = poiList.value[index]
  if (map && poi.location) {
    map.setCenter(poi.location)
  }
}

const handleConfirm = () => {
  const selected = poiList.value[selectedIndex.value]
  if (selected) {
    localStorage.setItem('picked_location', JSON.stringify({
      name: selected.name === '[当前位置]' ? selected.address : selected.name,
      address: selected.address,
      lat: selected.location ? (selected.location.lat || selected.location.getLat()) : null,
      lng: selected.location ? (selected.location.lng || selected.location.getLng()) : null,
    }))
    router.back()
  }
}

// 模拟模式：当 API Key 不可用时显示
const mockMapBehavior = () => {
  error.value = null
  loading.value = false
  poiList.value = [
    { name: '上海人民广场', address: '上海市黄浦区南京西路', location: { lat: 31.2304, lng: 121.4737 } },
    { name: '东方明珠', address: '上海市浦东新区世纪大道1号', location: { lat: 31.2397, lng: 121.4998 } },
    { name: '陆家嘴地铁站', address: '上海市浦东新区', location: { lat: 31.2360, lng: 121.5020 } }
  ]
}

const mockSearch = () => {
  searching.value = true
  setTimeout(() => {
    poiList.value = [
      { name: `搜索结果: ${searchKeyword.value}`, address: '模拟搜索出的详细地址', location: { lat: 31.2, lng: 121.5 } }
    ]
    searching.value = false
  }, 500)
}

onMounted(initMap)
onUnmounted(() => {
  if (map) map.destroy()
})
</script>

<style scoped>
.page-container { background: white; height: 100vh; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.nav-header span { font-weight: 700; font-size: 16px; }
.confirm-btn { background: var(--primary-color); color: white; border: none; padding: 6px 15px; border-radius: 8px; font-size: 13px; font-weight: 600; }

.map-container { flex: 1.2; background: #f0f0f0; position: relative; }
.loading-overlay, .error-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; z-index: 10; }
.loading-overlay i { font-size: 32px; color: var(--primary-color); }
.error-overlay { color: #FF3B30; }
.error-overlay button { margin-top: 10px; padding: 5px 15px; border-radius: 4px; border: 1px solid #FF3B30; background: transparent; color: #FF3B30; }

.center-marker { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); z-index: 5; pointer-events: none; }
.center-marker i { font-size: 40px; color: #FF3B30; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.poi-list { flex: 1; display: flex; flex-direction: column; background: white; border-top-left-radius: 20px; border-top-right-radius: 20px; margin-top: -20px; z-index: 20; box-shadow: 0 -4px 12px rgba(0,0,0,0.05); }
.search-bar { padding: 15px 20px; display: flex; align-items: center; background: #f5f5f5; margin: 15px 20px; border-radius: 12px; }
.search-bar i { color: #999; margin-right: 10px; }
.search-bar input { flex: 1; border: none; background: transparent; outline: none; font-size: 14px; }

.list-content { flex: 1; overflow-y: auto; padding: 0 20px; }
.poi-item { padding: 15px 0; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; }
.poi-item.active .poi-name { color: var(--primary-color); }
.poi-item.active i { color: var(--primary-color); font-size: 20px; }
.poi-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.poi-name { font-size: 15px; font-weight: 600; color: #333; }
.poi-address { font-size: 12px; color: #999; }

.list-msg { text-align: center; padding: 20px; color: #999; font-size: 13px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
