<!-- src/views/HomeView.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useVodaPayBridge } from '@/composables/useVodaPayBridge'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { login, loading: authLoading } = useAuth()
const { sendToMiniProgram } = useVodaPayBridge()

const searchQuery = ref('')
const selectedCategory = ref('All')

// Mock product data
const products = ref([
  { id: 1, name: 'Wireless Headphones', price: 299.99, category: 'Electronics', image: '🎧', rating: 4.5, reviews: 128 },
  { id: 2, name: 'Running Shoes', price: 899.00, category: 'Sports', image: '👟', rating: 4.7, reviews: 89 },
  { id: 3, name: 'Coffee Maker', price: 449.00, category: 'Home', image: '☕', rating: 4.3, reviews: 56 },
  { id: 4, name: 'Smart Watch', price: 1999.00, category: 'Electronics', image: '⌚', rating: 4.8, reviews: 234 },
  { id: 5, name: 'Yoga Mat', price: 199.00, category: 'Sports', image: '🧘', rating: 4.6, reviews: 77 },
  { id: 6, name: 'Desk Lamp', price: 149.00, category: 'Home', image: '💡', rating: 4.2, reviews: 43 },
])

const categories = ['All', 'Electronics', 'Sports', 'Home']

const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const matchesCategory = selectedCategory.value === 'All' || p.category === selectedCategory.value
    const matchesSearch = !searchQuery.value || p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesCategory && matchesSearch
  })
})

// Show login prompt if redirected here after auth-required action
const showLoginPrompt = computed(() => route.query.loginRequired === '1')

async function handleLogin() {
  try {
    await login()
    const redirect = route.query.redirect
    if (redirect) router.push(redirect)
  } catch (e) {
    console.error('[HomeView] Login failed:', e)
  }
}

function addToCart(product) {
  cartStore.addItem(product)
  // The cart store automatically notifies Mini Program via bridge
}

function handleShare() {
  // ✅ Trigger native VodaPay share sheet via Mini Program bridge
  sendToMiniProgram('SHARE', {
    title: 'VodaPay Store',
    desc: 'Shop and pay with VodaPay',
  })
}
</script>

<template>
  <article class="home-view">

    <!-- Hero banner -->
    <section class="hero">
      <header class="hero-content">
        <h2 class="hero-title">Welcome to<br><span class="brand">VodaPay Store</span></h2>
        <p class="hero-sub">Shop. Pay. Done.</p>
      </header>
      <button class="share-btn" @click="handleShare" aria-label="Share app">
        <span>Share</span>
      </button>
    </section>

    <!-- Login prompt (shown on auth redirect) -->
    <section v-if="showLoginPrompt" class="login-prompt card">
      <p class="prompt-text">Sign in with VodaPay to continue</p>
      <!-- ✅ Login button triggers the VodaPay OAuth flow via bridge -->
      <button class="btn-primary" :disabled="authLoading" @click="handleLogin">
        {{ authLoading ? 'Signing in…' : 'Sign in with VodaPay' }}
      </button>
    </section>

    <!-- Search -->
    <section class="search-section">
      <search class="search-wrap">
        <label for="search" class="sr-only">Search products</label>
        <span class="search-icon">🔍</span>
        <input
          id="search"
          v-model="searchQuery"
          type="search"
          placeholder="Search products…"
          class="search-input"
        />
      </search>
    </section>

    <!-- Category filters -->
    <nav class="categories" aria-label="Product categories">
      <button
        v-for="cat in categories"
        :key="cat"
        class="cat-btn"
        :class="{ 'cat-btn--active': selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </nav>

    <!--Products grid -->
    <section class="products-section">
      <header class="section-header">
        <h3 class="section-title">{{ selectedCategory === 'All' ? 'All Products' : selectedCategory }}</h3>
        <span class="product-count">{{ filteredProducts.length }} items</span>
      </header>

      <ul v-if="filteredProducts.length" class="products-grid" role="list">
        <li v-for="product in filteredProducts" :key="product.id">
          <ProductCard
            :product="product"
            @add-to-cart="addToCart"
            @view-product="router.push(`/product/${product.id}`)"
          />
        </li>
      </ul>

      <aside v-else class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>No products found</p>
        <button @click="searchQuery = ''; selectedCategory = 'All'" class="btn-outline" style="margin-top:12px; padding: 8px 20px">
          Clear filters
        </button>
      </aside>
    </section>

  </article>
</template>

<style scoped>
.home-view { padding-bottom: 80px; }

.hero {
  background: linear-gradient(135deg, #E60000 0%, #CC0000 60%, #990000 100%);
  padding: 28px 20px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-title {
  font-size: 26px;
  font-weight: 800;
  color: rgba(255,255,255,0.6);
  line-height: 1.2;
  margin-bottom: 4px;
}
.hero-title .brand { color: #fff; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); }

.share-btn {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.4);
  color: #fff;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.login-prompt {
  margin: 16px;
  padding: 20px;
  text-align: center;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.prompt-text { margin-bottom: 12px; font-size: 15px; font-weight: 500; }
.btn-primary {
  background: #E60000;
  color: #fff;
  border: none;
  border-radius: 24px;
  height: 44px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.btn-primary:disabled { opacity: 0.6; }

.search-section { padding: 16px 16px 0; }
.search-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1.5px solid #E8E8E8;
  border-radius: 10px;
  padding: 0 12px;
  gap: 8px;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  height: 42px;
  font-size: 15px;
  background: transparent;
}

.categories {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.categories::-webkit-scrollbar { display: none; }

.cat-btn {
  flex-shrink: 0;
  background: #fff;
  border: 1.5px solid #E8E8E8;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.cat-btn--active {
  background: #E60000;
  border-color: #E60000;
  color: #fff;
}

.products-section { padding: 0 16px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title { font-size: 17px; font-weight: 700; }
.product-count { font-size: 13px; color: #999; }

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  list-style: none;
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  color: #999;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }

.btn-outline {
  background: transparent;
  border: 1.5px solid #E60000;
  color: #E60000;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>