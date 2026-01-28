<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>发布需求</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="form-content">
      <div class="form-section">
        <label>服务类型</label>
        <div class="type-grid">
          <div 
            v-for="t in categories" 
            :key="t.id" 
            :class="['type-item', form.categoryId === t.id ? 'active' : '']"
            @click="handleSelectCategory(t)"
          >
            <i :class="t.icon"></i>
            <span>{{ t.name }}</span>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label>预约上门时间</label>
        <div class="input-group">
          <i class="ri-calendar-todo-line"></i>
          <input type="datetime-local" v-model="form.serviceTime" />
        </div>
      </div>

      <div class="form-section" v-if="selectedCategory?.unit === '小时'">
        <label>服务时长 (预计)</label>
        <div class="duration-grid">
          <span 
            v-for="d in ['2小时', '3小时', '4小时', '6小时']" 
            :key="d" 
            :class="['duration-item', form.estimatedDuration === d ? 'active' : '']"
            @click="form.estimatedDuration = d"
          >
            {{ d }}
          </span>
        </div>
      </div>

      <div class="form-section">
        <label>耗材/工具</label>
        <div class="tool-box" @click="form.needsTools = !form.needsTools">
          <div class="left">
            <i class="ri-paint-brush-line"></i>
            <span>师傅自带清洁工具与耗材 (需额外+20元)</span>
          </div>
          <div :class="['toggle', form.needsTools ? 'active' : '']">
            <div class="dot"></div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label>服务地址</label>
        <div class="address-selector" @click="router.push('/address/list?mode=select')">
          <div v-if="selectedAddress" class="addr-info">
            <strong>{{ selectedAddress.name }} {{ selectedAddress.phone }}</strong>
            <p>{{ selectedAddress.location }} {{ selectedAddress.addressDetail }}</p>
          </div>
          <div v-else class="addr-placeholder">
            <i class="ri-map-pin-line"></i>
            <span>选择服务地址</span>
          </div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
      </div>

      <div class="form-section">
        <label>服务价格 (元) <span v-if="form.categoryId" style="font-size: 12px; font-weight: normal; color: #999;"> / {{ categories.find(c => c.id === form.categoryId)?.unit }}</span></label>
        <div class="input-group">
          <i class="ri-money-cny-circle-line"></i>
          <input type="number" v-model="form.price" placeholder="请输入预算金额" />
        </div>
      </div>

      <!-- 服务标准与规范 -->
      <div class="form-section" v-if="selectedCategory?.checklist || selectedCategory?.exclusions">
        <div class="standard-box">
          <div v-if="selectedCategory.checklist" class="sub-section">
            <div class="sub-title"><i class="ri-checkbox-circle-line"></i> 服务包含</div>
            <div class="tag-list">
              <span v-for="item in selectedCategory.checklist.split(',')" :key="item" class="item-tag">{{ item }}</span>
            </div>
          </div>
          <div v-if="selectedCategory.exclusions" class="sub-section">
            <div class="sub-title"><i class="ri-close-circle-line"></i> 不包含内容</div>
            <div class="tag-list">
              <span v-for="item in selectedCategory.exclusions.split(',')" :key="item" class="item-tag exclude">{{ item }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label>备注说明</label>
        <textarea v-model="form.notes" placeholder="请描述您的具体要求（如：有宠物、自带工具等）"></textarea>
      </div>

      <div class="form-section">
        <label>优惠券</label>
        <div class="coupon-selector" @click="handleSelectCoupon">
          <div v-if="selectedCoupon" class="coupon-info">
            <span class="coupon-tag">已省¥{{ selectedCoupon.coupon.amount }}</span>
            <span class="coupon-title">{{ selectedCoupon.coupon.title }}</span>
          </div>
          <div v-else class="coupon-placeholder">
            <span>{{ applicableCouponsCount > 0 ? `${applicableCouponsCount}张可用` : '无可用优惠券' }}</span>
          </div>
          <i class="ri-arrow-right-s-line"></i>
        </div>
      </div>

      <div class="form-section">
        <label>保险保障</label>
        <div class="insurance-box">
          <div class="left">
            <i class="ri-shield-check-line"></i>
            <div class="text">
              <strong>人身/财产意外险保障</strong>
              <p>本订单由好帮手平台提供安全保障，最高赔付10万元</p>
            </div>
          </div>
          <span class="status">保障中</span>
        </div>
      </div>

      <button class="submit-btn" @click="handleSubmit" :disabled="loading">
        {{ loading ? '发布中...' : `立即发布 (实付¥${finalPayAmount})` }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../api';
import { getCurrentLocation, getAddressFromCoords } from '../utils/location';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const selectedAddress = ref(null);
const categories = ref([]);
const selectedCoupon = ref(null);
const applicableCouponsCount = ref(0);

const form = reactive({
  categoryId: null,
  type: '',
  serviceTime: '',
  estimatedDuration: '2小时',
  needsTools: false,
  price: '',
  notes: ''
});

const selectedCategory = computed(() => {
  return categories.value.find(c => c.id === form.categoryId);
});

const finalPayAmount = computed(() => {
  let p = Number(form.price) || 0;
  if (form.needsTools) p += 20;
  const c = selectedCoupon.value ? Number(selectedCoupon.value.coupon.amount) : 0;
  return Math.max(0, p - c).toFixed(2);
});

const fetchCategories = async () => {
  try {
    const res = await api.get('/service-categories');
    categories.value = res.data;
    
    // 如果 URL 传了 ID，选中它
    const catId = route.query.categoryId;
    if (catId) {
      const cat = categories.value.find(c => c.id === Number(catId));
      if (cat) {
        form.categoryId = cat.id;
        form.type = cat.name;
        form.price = Number(cat.basePrice);
      }
    } else if (categories.value.length > 0) {
      const first = categories.value[0];
      form.categoryId = first.id;
      form.type = first.name;
      form.price = Number(first.basePrice);
    }
    fetchApplicableCoupons();
  } catch (err) {
    console.error(err);
  }
};

const fetchApplicableCoupons = async () => {
  if (!form.price) return;
  try {
    const res = await api.get(`/coupons/applicable?amount=${form.price}`);
    applicableCouponsCount.value = res.data.length;
  } catch (err) {
    console.error(err);
  }
};

const handleSelectCoupon = () => {
  if (!form.price) {
    alert('请先选择服务或输入价格');
    return;
  }
  router.push(`/my-coupons?mode=select&minAmount=${form.price}`);
};

const handleSelectCategory = (cat) => {
  form.categoryId = cat.id;
  form.type = cat.name;
  form.price = Number(cat.basePrice);
  fetchApplicableCoupons();
}

onMounted(() => {
  fetchCategories();
  const addr = localStorage.getItem('selected_address');
  if (addr) {
    selectedAddress.value = JSON.parse(addr);
  } else {
    // 尝试获取默认地址
    fetchDefaultAddress();
  }

  const cp = localStorage.getItem('selected_coupon');
  if (cp) {
    selectedCoupon.value = JSON.parse(cp);
  }
});

onUnmounted(() => {
  localStorage.removeItem('selected_address');
  localStorage.removeItem('selected_coupon');
});

const fetchDefaultAddress = async () => {
  try {
    const res = await api.get('/addresses');
    const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
    if (defaultAddr) {
      selectedAddress.value = defaultAddr;
    }
  } catch (err) {
    console.error(err);
  }
};

const handleGetLocation = async () => {
  // 此方法在新的 UI 中可能不再直接使用，但保留作为备用
  try {
    const loc = await getCurrentLocation();
    const addr = await getAddressFromCoords(loc.lat, loc.lng);
    // 这里可以跳转到新增地址页并带入数据
    router.push({
      path: '/address/edit',
      query: { location: addr, lat: loc.lat, lng: loc.lng }
    });
  } catch (err) {
    alert(err.message);
  }
};

const handleSubmit = async () => {
  if (!form.serviceTime || !selectedAddress.value || !form.price) {
    alert('请填写完整信息');
    return;
  }

  loading.value = true;
  try {
    // 构造后端需要的数据结构
    const orderData = {
      serviceType: form.type,
      serviceTime: new Date(form.serviceTime).toISOString(),
      estimatedDuration: form.estimatedDuration,
      needsTools: form.needsTools,
      location: selectedAddress.value.location,
      addressDetail: selectedAddress.value.addressDetail,
      lat: selectedAddress.value.lat,
      lng: selectedAddress.value.lng,
      contactPhone: selectedAddress.value.phone,
      amount: Number(form.price),
      userCouponId: selectedCoupon.value ? selectedCoupon.value.id : null,
      couponAmount: selectedCoupon.value ? Number(selectedCoupon.value.coupon.amount) : 0,
      remark: form.notes || '无特殊要求'
    };

    await api.post('/orders', orderData);
    alert('需求发布成功！师傅们正在赶来的路上。');
    router.push('/');
  } catch (error) {
    console.error(error);
    alert(error.response?.data?.message || '发布失败，请重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.page-container { background: var(--bg-color); height: 100%; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 10px; display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #eee; }
.nav-header i { font-size: 24px; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 18px; }

.form-content { flex: 1; overflow-y: auto; padding: 20px; }
.form-section { margin-bottom: 25px; }
.form-section label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--text-main); }

.type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.type-item { background: white; padding: 15px; border-radius: 12px; text-align: center; border: 2px solid transparent; transition: 0.3s; cursor: pointer; box-shadow: var(--shadow); }
.type-item i { font-size: 20px; margin-bottom: 5px; display: block; color: var(--text-sub); }
.type-item span { font-size: 13px; font-weight: 500; }
.type-item.active { border-color: var(--primary-color); background: #EEF2FF; }
.type-item.active i { color: var(--primary-color); }

.input-group { background: white; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; box-shadow: var(--shadow); }
.input-group i { color: var(--primary-color); margin-right: 10px; font-size: 18px; }
.input-group .loc-icon { margin-right: 0; margin-left: 10px; cursor: pointer; color: var(--primary-color); }
.input-group input { border: none; outline: none; flex: 1; font-size: 14px; background: transparent; }

.address-selector { background: white; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow); cursor: pointer; }
.addr-info { flex: 1; }
.addr-info strong { display: block; font-size: 15px; margin-bottom: 4px; }
.addr-info p { font-size: 12px; color: var(--text-sub); }
.addr-placeholder { flex: 1; display: flex; align-items: center; gap: 8px; color: var(--text-sub); font-size: 14px; }
.addr-placeholder i { font-size: 18px; color: var(--primary-color); }

.coupon-selector { background: white; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow); cursor: pointer; margin-top: 10px; }
.coupon-info { display: flex; align-items: center; gap: 8px; }
.coupon-tag { background: #FF3B30; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
.coupon-title { font-size: 14px; font-weight: 600; }
.coupon-placeholder { color: var(--text-sub); font-size: 14px; }

.insurance-box { background: #F0FFF4; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #C6F6D5; margin-top: 10px; }
.insurance-box .left { display: flex; align-items: center; gap: 12px; }
.insurance-box i { font-size: 24px; color: #38A169; }
.insurance-box strong { display: block; font-size: 13px; color: #2F855A; margin-bottom: 2px; }
.insurance-box p { font-size: 11px; color: #48BB78; margin: 0; }
.insurance-box .status { font-size: 11px; font-weight: 700; color: #38A169; background: white; padding: 2px 8px; border-radius: 20px; }

.standard-box { background: white; padding: 15px; border-radius: 12px; box-shadow: var(--shadow); border: 1px solid #f0f0f0; }
.sub-section { margin-bottom: 12px; }
.sub-section:last-child { margin-bottom: 0; }
.sub-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
.sub-title i { font-size: 16px; }
.sub-title .ri-checkbox-circle-line { color: #38A169; }
.sub-title .ri-close-circle-line { color: #E53E3E; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.item-tag { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.item-tag.exclude { background: #fff5f5; color: #9b2c2c; border-color: #fed7d7; }

.duration-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.duration-item { background: white; padding: 10px 0; border-radius: 10px; text-align: center; font-size: 12px; border: 1px solid #eee; transition: 0.3s; cursor: pointer; }
.duration-item.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tool-box { background: white; padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: var(--shadow); cursor: pointer; }
.tool-box .left { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.tool-box .left i { color: var(--primary-color); font-size: 18px; }
.toggle { width: 44px; height: 24px; background: #eee; border-radius: 12px; position: relative; transition: 0.3s; }
.toggle.active { background: var(--primary-color); }
.toggle .dot { width: 20px; height: 20px; background: white; border-radius: 10px; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
.toggle.active .dot { left: 22px; }

textarea { width: 100%; height: 100px; border: none; padding: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow); outline: none; font-size: 14px; resize: none; }

.submit-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; margin-top: 20px; cursor: pointer; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
