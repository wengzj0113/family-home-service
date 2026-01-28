<template>
  <div class="withdraw-audit">
    <div class="page-header">
      <h2>提现申请审核</h2>
      <el-button :icon="Refresh" @click="fetchWithdrawals">刷新</el-button>
    </div>

    <el-card shadow="never" class="table-card">
      <el-table :data="withdrawals" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="申请人" width="180">
          <template #default="scope">
            <div class="user-info">
              <el-avatar :size="32" :src="scope.row.user?.avatar" />
              <div class="name-phone">
                <span>{{ scope.row.user?.nickname }}</span>
                <small>{{ scope.row.user?.phone }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="scope">
            <span class="amount">¥{{ scope.row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="method" label="方式" width="100">
          <template #default="scope">
            <el-tag :type="getMethodType(scope.row.method)">{{ getMethodName(scope.row.method) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="accountInfo" label="账号信息" min-width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">{{ getStatusName(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <template v-if="scope.row.status === 0">
              <el-button size="small" type="success" @click="handleAudit(scope.row, 2)">通过并打款</el-button>
              <el-button size="small" type="danger" @click="handleAudit(scope.row, 3)">驳回</el-button>
            </template>
            <span v-else class="done-text">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const withdrawals = ref([])
const loading = ref(false)

const fetchWithdrawals = async () => {
  loading.value = true
  try {
    const res = await api.get('/withdrawals/admin/all')
    withdrawals.value = res.data
  } catch (err) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleAudit = (row, status) => {
  const action = status === 2 ? '通过' : '驳回'
  ElMessageBox.prompt(`确认要${action}这笔 ¥${row.amount} 的提现申请吗？`, '审核提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入审核备注（可选）',
  }).then(async ({ value }) => {
    try {
      await api.patch(`/withdrawals/${row.id}/audit`, { status, remark: value })
      ElMessage.success(`审核已${action}`)
      fetchWithdrawals()
    } catch (err) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

const getMethodName = (m) => ({ wechat: '微信', alipay: '支付宝', bank: '银行卡' }[m] || m)
const getMethodType = (m) => ({ wechat: 'success', alipay: 'primary', bank: 'warning' }[m] || 'info')
const getStatusName = (s) => ({ 0: '待审核', 1: '处理中', 2: '已完成', 3: '已驳回' }[s] || '未知')
const getStatusType = (s) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'danger' }[s] || 'info')
const formatTime = (t) => new Date(t).toLocaleString()

onMounted(fetchWithdrawals)
</script>

<style scoped>
.withdraw-audit { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.user-info { display: flex; align-items: center; gap: 10px; }
.name-phone { display: flex; flex-direction: column; }
.name-phone small { color: #999; }
.amount { font-weight: bold; color: #f56c6c; }
.done-text { color: #999; font-size: 12px; }
</style>
