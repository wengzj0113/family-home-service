<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>累计GMV</template>
          <div class="stat-value primary">¥{{ stats.gmv || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>平台净营收</template>
          <div class="stat-value success">¥{{ (stats.totalCommission || 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>累计订单</template>
          <div class="stat-value">{{ stats.totalOrders || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>注册用户</template>
          <div class="stat-value">{{ stats.totalUsers || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>待抢订单</template>
          <div class="stat-value warning">{{ stats.pendingOrders || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <template #header>待审核提现</template>
          <div class="stat-value danger">{{ stats.pendingWithdrawals || 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card header="快捷操作">
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/workers')">审核新师傅</el-button>
            <el-button type="danger" @click="$router.push('/withdrawals')">提现审核</el-button>
            <el-button type="success" @click="$router.push('/orders')">订单大盘</el-button>
            <el-button type="info" @click="$router.push('/tickets')">工单处理</el-button>
            <el-button type="warning" @click="$router.push('/config')">抽佣配置</el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="最新工单">
          <el-table :data="recentTickets" style="width: 100%" size="small">
            <el-table-column prop="title" label="标题" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === 0 ? 'danger' : 'info'">{{ row.status === 0 ? '待处理' : '已处理' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default>
                <el-button link type="primary" @click="$router.push('/tickets')">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const stats = ref({
  gmv: 0,
  totalCommission: 0,
  totalOrders: 0,
  totalUsers: 0,
  pendingOrders: 0,
  pendingWithdrawals: 0
})
const recentTickets = ref([])

const fetchStats = async () => {
  try {
    // 统一从 config/stats 获取（后端已更新 getPlatformStats 并关联到了这个接口）
    const res = await api.get('/config/stats')
    stats.value = res.data
  } catch (err) {
    console.error(err)
  }
}

const fetchRecentTickets = async () => {
  try {
    const res = await api.get('/support/admin/all')
    recentTickets.value = res.data.slice(0, 5)
  } catch (err) {
    console.error(err)
  }
}

onMounted(() => {
  fetchStats()
  fetchRecentTickets()
})
</script>

<style scoped>
.dashboard-container { padding: 20px; }
.stat-card { text-align: center; }
.stat-value { font-size: 24px; font-weight: bold; margin: 10px 0; color: #409EFF; }
.stat-value.primary { color: #409EFF; }
.stat-value.success { color: #67C23A; }
.stat-value.warning { color: #E6A23C; }
.stat-value.danger { color: #F56C6C; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 10px; }
</style>
