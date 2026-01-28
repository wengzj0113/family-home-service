import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import OrderCreate from '../views/OrderCreate.vue'
import WorkerVerify from '../views/WorkerVerify.vue'
import Orders from '../views/Orders.vue'
import Profile from '../views/Profile.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Settings from '../views/Settings.vue'
import RoleManage from '../views/RoleManage.vue'
import Wallet from '../views/Wallet.vue'
import RatingCreate from '../views/RatingCreate.vue'
import Withdraw from '../views/Withdraw.vue'
import Messages from '../views/Messages.vue'
import AddressList from '../views/AddressList.vue'
import AddressEdit from '../views/AddressEdit.vue'
import Chat from '../views/Chat.vue'
import WorkerDetail from '../views/WorkerDetail.vue'
import MapPicker from '../views/MapPicker.vue'
import CouponList from '../views/CouponList.vue'
import MyCoupons from '../views/MyCoupons.vue'
import Store from '../views/Store.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/order/create', component: OrderCreate, meta: { requiresAuth: true } },
  { path: '/worker/verify', component: WorkerVerify, meta: { requiresAuth: true } },
  { path: '/worker/:id', component: WorkerDetail, meta: { requiresAuth: true } },
  { path: '/orders', component: Orders, meta: { requiresAuth: true } },
  { path: '/messages', component: Messages, meta: { requiresAuth: true } },
  { path: '/chat/:contactId', component: Chat, meta: { requiresAuth: true } },
  { path: '/map-picker', component: MapPicker, meta: { requiresAuth: true } },
  { path: '/coupons', component: CouponList, meta: { requiresAuth: true } },
  { path: '/my-coupons', component: MyCoupons, meta: { requiresAuth: true } },
  { path: '/store', component: Store, meta: { requiresAuth: true } },
  { path: '/profile', component: Profile },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
  { path: '/role-manage', component: RoleManage, meta: { requiresAuth: true } },
  { path: '/wallet', component: Wallet, meta: { requiresAuth: true } },
  { path: '/withdraw', component: Withdraw, meta: { requiresAuth: true } },
  { path: '/address/list', component: AddressList, meta: { requiresAuth: true } },
  { path: '/address/edit', component: AddressEdit, meta: { requiresAuth: true } },
  { path: '/address/edit/:id', component: AddressEdit, meta: { requiresAuth: true } },
  { path: '/rating/create/:id', component: RatingCreate, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
