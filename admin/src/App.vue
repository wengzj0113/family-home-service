<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <div class="logo">
        <img src="/logo.png" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px; border-radius: 6px;">
        好帮手管理后台
      </div>
      <el-menu
        default-active="/dashboard"
        router
        class="el-menu-vertical"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/workers">
          <el-icon><Checked /></el-icon>
          <span>师傅审核</span>
        </el-menu-item>
        <el-menu-item index="/withdrawals">
          <el-icon><Money /></el-icon>
          <span>提现审核</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/tickets">
          <el-icon><ChatDotRound /></el-icon>
          <span>客服工单</span>
        </el-menu-item>
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <span>平台配置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-left">
          <span class="title">好帮手运营管理系统</span>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="el-dropdown-link">
              管理员 <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { Setting, DataLine, User, List, Checked, ArrowDown, Money, ChatDotRound } from '@element-plus/icons-vue'

const handleLogout = () => {
  localStorage.removeItem('token')
  window.location.href = 'http://localhost:3001/#/login'
}

onMounted(() => {
  // 从 URL 捕获 Token 并保存
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (token) {
    localStorage.setItem('token', token)
    // 清除 URL 中的 token，保持美观
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.layout-container {
  height: 100vh;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background: #2b2f3a;
}
.el-header {
  background-color: #fff;
  color: #333;
  line-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}
.header-left .title {
  font-size: 16px;
  font-weight: 600;
}
.el-aside {
  background-color: #304156;
}
.el-menu {
  border-right: none;
}
.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
