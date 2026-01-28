import { createRouter, createWebHistory } from 'vue-router'
import Config from '../views/Config.vue'
import Dashboard from '../views/Dashboard.vue'
import UserList from '../views/UserList.vue'
import WorkerAudit from '../views/WorkerAudit.vue'
import OrderList from '../views/OrderList.vue'
import WithdrawAudit from '../views/WithdrawAudit.vue'
import TicketList from '../views/TicketList.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/users',
    name: 'UserList',
    component: UserList
  },
  {
    path: '/workers',
    name: 'WorkerAudit',
    component: WorkerAudit
  },
  {
    path: '/withdrawals',
    name: 'WithdrawAudit',
    component: WithdrawAudit
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: OrderList
  },
  {
    path: '/tickets',
    name: 'TicketList',
    component: TicketList
  },
  {
    path: '/config',
    name: 'Config',
    component: Config
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
