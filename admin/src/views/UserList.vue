<template>
  <div class="users-container">
    <div class="header">
      <h2>用户管理</h2>
      <el-input
        v-model="search"
        placeholder="搜索手机号或昵称"
        style="width: 300px"
        clearable
      />
    </div>

    <el-table :data="filteredUsers" border style="width: 100%; margin-top: 20px" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="头像" width="80">
        <template #default="scope">
          <el-avatar :src="scope.row.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${scope.row.phone}`" />
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column label="身份" width="180">
        <template #default="scope">
          <el-tag 
            v-for="role in scope.row.roles" 
            :key="role" 
            style="margin-right: 5px"
            :type="role === 'admin' ? 'danger' : (role === 'worker' ? 'warning' : 'success')"
          >
            {{ role === 'admin' ? '管理员' : (role === 'worker' ? '师傅' : '客户') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="balance" label="余额 (元)" width="100" />
      <el-table-column prop="createdAt" label="注册时间" width="180">
        <template #default="scope">
          {{ new Date(scope.row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-switch
            v-model="scope.row.status"
            :active-value="1"
            :inactive-value="0"
            @change="handleStatusChange(scope.row)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api'
import { ElMessage } from 'element-plus'

const users = ref([])
const loading = ref(false)
const search = ref('')

const filteredUsers = computed(() => {
  return users.value.filter(u => 
    u.phone.includes(search.value) || 
    (u.nickname && u.nickname.includes(search.value))
  )
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/users', { params: { page: 1, pageSize: 200 } })
    if (Array.isArray(res.data)) users.value = res.data
    else if (Array.isArray(res.data?.list)) users.value = res.data.list
    else users.value = []
  } catch (err) {
    ElMessage.error(err?.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleStatusChange = async (user) => {
  try {
    await api.patch(`/auth/users/${user.id}/status`, { status: user.status })
    ElMessage.success('用户状态更新成功')
  } catch (err) {
    ElMessage.error('更新失败')
    user.status = user.status === 1 ? 0 : 1
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-container { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
</style>
