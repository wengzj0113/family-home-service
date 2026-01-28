<template>
  <div class="tickets-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>客服工单/申诉管理</span>
        </div>
      </template>

      <el-table :data="tickets" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            {{ row.user?.nickname || row.user?.phone }}
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="180" />
        <el-table-column prop="description" label="内容" show-overflow-tooltip />
        <el-table-column prop="orderId" label="关联订单" width="100" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleReply(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialogVisible" title="工单处理" width="500px">
      <el-form :model="replyForm" label-width="80px">
        <el-form-item label="用户内容">
          <el-alert :title="activeTicket?.description" :closable="false" type="info" />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="replyForm.status">
            <el-option :value="1" label="处理中" />
            <el-option :value="2" label="已解决" />
            <el-option :value="3" label="已关闭" />
          </el-select>
        </el-form-item>
        <el-form-item label="回复内容">
          <el-input v-model="replyForm.adminReply" type="textarea" rows="4" placeholder="给用户的回复..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="submitting">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const tickets = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const activeTicket = ref(null)
const replyForm = ref({
  status: 1,
  adminReply: ''
})

const fetchTickets = async () => {
  loading.value = true
  try {
    const res = await api.get('/support/admin/all')
    tickets.value = res.data
  } catch (err) {
    ElMessage.error('获取工单失败')
  } finally {
    loading.value = false
  }
}

const getStatusText = (s) => {
  const texts = ['待处理', '处理中', '已解决', '已关闭']
  return texts[s] || '未知'
}

const getStatusType = (s) => {
  const types = ['danger', 'warning', 'success', 'info']
  return types[s] || 'info'
}

const handleReply = (ticket) => {
  activeTicket.value = ticket
  replyForm.value.status = ticket.status
  replyForm.value.adminReply = ticket.adminReply || ''
  dialogVisible.value = true
}

const submitReply = async () => {
  submitting.value = true
  try {
    await api.patch(`/support/admin/tickets/${activeTicket.value.id}`, replyForm.value)
    ElMessage.success('处理成功')
    dialogVisible.value = false
    fetchTickets()
  } catch (err) {
    ElMessage.error('处理失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchTickets)
</script>

<style scoped>
.tickets-container { padding: 20px; }
</style>
