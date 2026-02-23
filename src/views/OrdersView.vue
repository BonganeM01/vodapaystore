<!-- src/views/OrdersView.vue -->
<script setup>
// OrdersView.vue — Order history page
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const orders = ref([])
const loading = ref(false)

// Placeholder orders for demo — replace with real API call
onMounted(() => {
  orders.value = [
    { id: 'ORD-001', date: '2025-02-20', total: 299.99, status: 'Delivered', items: 1 },
    { id: 'ORD-002', date: '2025-02-15', total: 1099.00, status: 'In Transit', items: 2 },
    { id: 'ORD-003', date: '2025-02-10', total: 449.00, status: 'Processing', items: 1 },
  ]
})

const statusColor = (status) => ({
  Delivered: '#2E7D32',
  'In Transit': '#1565C0',
  Processing: '#E65100',
}[status] || '#666')
</script>

<template>
  <article class="orders-view">
    <header class="view-header">
      <button class="back-btn" @click="router.back()">← Back</button>
      <h2>My Orders</h2>
    </header>

    <ul v-if="orders.length" class="orders-list" role="list">
      <li v-for="order in orders" :key="order.id" class="order-card card">
        <header class="order-header">
          <span class="order-id">{{ order.id }}</span>
          <span class="order-status" :style="{ color: statusColor(order.status) }">
            {{ order.status }}
          </span>
        </header>
        <p class="order-date">{{ order.date }} · {{ order.items }} item{{ order.items > 1 ? 's' : '' }}</p>
        <footer class="order-footer">
          <span class="order-total">R {{ order.total.toFixed(2) }}</span>
          <button class="reorder-btn">Reorder</button>
        </footer>
      </li>
    </ul>

    <aside v-else class="empty-state">
      <span class="empty-icon">📦</span>
      <p>No orders yet</p>
      <button class="btn-primary" @click="router.push('/')">Start Shopping</button>
    </aside>
  </article>
</template>

<style scoped>
.orders-view { padding: 16px; padding-bottom: 100px; }
.view-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.view-header h2 { font-size: 22px; font-weight: 800; }
.back-btn { background: none; border: none; font-size: 15px; color: #E60000; cursor: pointer; }
.orders-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.order-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.order-id { font-size: 15px; font-weight: 700; }
.order-status { font-size: 13px; font-weight: 600; }
.order-date { font-size: 13px; color: #999; margin-bottom: 12px; }
.order-footer { display: flex; justify-content: space-between; align-items: center; }
.order-total { font-size: 17px; font-weight: 800; color: #E60000; }
.reorder-btn { background: #E60000; color: #fff; border: none; border-radius: 16px; padding: 6px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 0; gap: 12px; }
.empty-icon { font-size: 56px; }
.btn-primary { background: #E60000; color: #fff; border: none; border-radius: 24px; height: 44px; padding: 0 28px; font-size: 15px; font-weight: 600; cursor: pointer; }
</style>