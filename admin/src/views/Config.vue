<template>
  <div class="config-container">
    <h2>平台配置</h2>
    <el-card class="box-card">
      <el-form :model="form" label-width="120px">
        <el-form-item label="平台抽佣比例">
          <el-input-number 
            v-model="form.commissionRate" 
            :precision="2" 
            :step="0.01" 
            :min="0.05" 
            :max="0.10"
          ></el-input-number>
          <div class="tip">设置范围：5% - 10%</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveConfig">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const form = ref({
  commissionRate: 0.08
})

const fetchConfig = async () => {
  try {
    const res = await api.get('/config/commission_rate')
    form.value.commissionRate = res.data.value
  } catch (err) {
    console.error('Failed to fetch config', err)
  }
}

const saveConfig = async () => {
  try {
    await api.post('/config/commission_rate', { value: form.value.commissionRate })
    ElMessage.success('配置保存成功')
  } catch (err) {
    ElMessage.error('保存失败')
  }
}

onMounted(fetchConfig)
</script>

<style scoped>
.config-container { padding: 20px; }
.box-card { max-width: 600px; }
.tip { color: #999; font-size: 12px; margin-top: 5px; }
</style>
