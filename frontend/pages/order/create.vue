<template>
  <view class="container">
    <view class="form-group">
      <text class="label">服务类型</text>
      <input class="input" v-model="form.serviceType" disabled />
    </view>
    <view class="form-group">
      <text class="label">服务时间</text>
      <picker mode="date" @change="onDateChange">
        <view class="picker-val">{{ form.date || '请选择日期' }}</view>
      </picker>
    </view>
    <view class="form-group">
      <text class="label">服务地址</text>
      <input class="input" v-model="form.location" placeholder="请输入服务地址" />
    </view>
    <view class="form-group">
      <text class="label">联系电话</text>
      <input class="input" v-model="form.contactPhone" placeholder="请输入联系电话" />
    </view>
    <view class="form-group">
      <text class="label">订单金额 (元)</text>
      <input class="input" type="digit" v-model="form.amount" placeholder="请输入预估金额" />
    </view>
    <button class="submit-btn" @click="submit">立即发布</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      form: {
        serviceType: '',
        date: '',
        location: '',
        contactPhone: '',
        amount: ''
      }
    };
  },
  onLoad(options) {
    if (options.type) {
      this.form.serviceType = options.type;
    }
  },
  methods: {
    onDateChange(e) {
      this.form.date = e.detail.value;
    },
    submit() {
      // Call backend API to create order
      uni.request({
        url: 'http://localhost:3000/orders',
        method: 'POST',
        header: {
          'Authorization': 'Bearer ' + uni.getStorageSync('token')
        },
        data: {
          serviceType: this.form.serviceType,
          serviceTime: this.form.date,
          location: this.form.location,
          contactPhone: this.form.contactPhone,
          amount: parseFloat(this.form.amount)
        },
        success: (res) => {
          if (res.statusCode === 201) {
            uni.showToast({ title: '发布成功' });
            setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 1500);
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.container { padding: 20px; }
.form-group { margin-bottom: 20px; }
.label { display: block; margin-bottom: 8px; font-weight: bold; }
.input, .picker-val { 
  background-color: #fff; 
  padding: 12px; 
  border-radius: 5px; 
  border: 1px solid #ddd;
}
.submit-btn { 
  background-color: #3cc51f; 
  color: #fff; 
  margin-top: 30px; 
}
</style>
