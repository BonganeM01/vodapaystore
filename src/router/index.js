// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'VodaPay Store' },
  },
  {
    path: '/product/:id',
    component: () => import('@/views/ProductView.vue'),
    meta: { title: 'Product Details' },
  },
  {
    path: '/cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: 'My Cart' },
  },
  {
    path: '/checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: 'Checkout', requiresAuth: true },
  },
  {
    path: '/profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'My Profile', requiresAuth: true },
  },
  {
    path: '/orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: { title: 'My Orders', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { path: '/', query: { loginRequired: '1', redirect: to.fullPath } }
  }
})

export default router
