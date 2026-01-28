<template>
  <div class="workers-container">
    <h2>师傅认证审核</h2>
    
    <el-table :data="pendingWorkers" border style="width: 100%; margin-top: 20px" v-loading="loading">
      <el-table-column prop="userId" label="用户ID" width="80" />
      <el-table-column prop="realName" label="真实姓名" width="120" />
      <el-table-column prop="idCardNo" label="身份证号" width="180" />
      <el-table-column prop="skills" label="专业技能" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button type="success" size="small" @click="handleAudit(scope.row.userId, 2)">通过</el-button>
          <el-button type="danger" size="small" @click="handleAudit(scope.row.userId, 3)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const workers = ref([])
const loading = ref(false)

const pendingWorkers = ref([])

const fetchWorkers = async () => {
  loading.value = true
  try {
    const res = await api.get('/auth/users')
    if (Array.isArray(res.data)) {
      // 过滤出申请认证中的师傅 (auditStatus === 1)
      pendingWorkers.value = res.data
        .filter(u => u.profile && u.profile.auditStatus === 1)
        .map(u => ({ ...u.profile, userId: u.id })) // 确保 userId 正确
    }
  } catch (err) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleAudit = async (userId, status) => {
  try {
    await api.post(`/auth/worker/${userId}/audit`, { status })
    ElMessage.success(status === 2 ? '审核已通过' : '已驳回申请')
    fetchWorkers()
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

onMounted(fetchWorkers)
</script>

<style scoped>
.workers-container { padding: 20px; }
</style>
