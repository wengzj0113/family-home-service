<template>
  <div class="orders-container">
    <div class="header">
      <h2>全平台订单管理</h2>
      <el-radio-group v-model="filterStatus" @change="fetchOrders">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button :label="0">待抢单</el-radio-button>
        <el-radio-button :label="1">进行中</el-radio-button>
        <el-radio-button :label="2">已完成</el-radio-button>
        <el-radio-button :label="4">已结算</el-radio-button>
      </el-radio-group>
    </div>

    <el-table :data="filteredOrders" border style="width: 100%; margin-top: 20px" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="180" />
      <el-table-column prop="serviceType" label="类型" width="100" />
      <el-table-column label="客户" width="150">
        <template #default="scope">
          {{ scope.row.customer?.nickname || '未知' }} ({{ scope.row.customer?.phone }})
        </template>
      </el-table-column>
      <el-table-column label="师傅" width="150">
        <template #default="scope">
          <span v-if="scope.row.worker">
            {{ scope.row.worker?.nickname || '未设置' }} ({{ scope.row.worker?.phone }})
          </span>
          <span v-else style="color: #999">未接单</span>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ getStatusText(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="下单时间" width="180">
        <template #default="scope">
          {{ new Date(scope.row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const orders = ref([])
const loading = ref(false)
const filterStatus = ref('')

const getStatusText = (status) => {
  const texts = { 0: '待抢单', 1: '进行中', 2: '已完成', 3: '已取消', 4: '已结算' }
  return texts[status] || '未知'
}

const getStatusType = (status) => {
  const types = { 0: 'info', 1: 'primary', 2: 'success', 3: 'danger', 4: 'warning' }
  return types[status] || ''
}

const filteredOrders = computed(() => {
  if (filterStatus.value === '') return orders.value
  return orders.value.filter(o => o.status === filterStatus.value)
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await api.get('/orders/admin/all')
    if (Array.isArray(res.data)) {
      orders.value = res.data
    }
  } catch (err) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrders)
</script>

<style scoped>
.orders-container { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
</style>
