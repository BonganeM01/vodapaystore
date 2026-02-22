<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

// In production, fetch product from your API using route.params.id
const allProducts = [
  { id: 1, name: 'Wireless Headphones', price: 299.99, category: 'Electronics', image: '🎧', rating: 4.5, reviews: 128, description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and exceptional sound quality.' },
  { id: 2, name: 'Running Shoes', price: 899.00, category: 'Sports', image: '👟', rating: 4.7, reviews: 89, description: 'Lightweight running shoes with superior cushioning and breathable mesh upper for all-terrain performance.' },
  { id: 3, name: 'Coffee Maker', price: 449.00, category: 'Home', image: '☕', rating: 4.3, reviews: 56, description: 'Programmable 12-cup coffee maker with built-in grinder and thermal carafe to keep your coffee hot all day.' },
  { id: 4, name: 'Smart Watch', price: 1999.00, category: 'Electronics', image: '⌚', rating: 4.8, reviews: 234, description: 'Advanced smart watch with health monitoring, GPS, 5-day battery, and seamless VodaPay payments.' },
  { id: 5, name: 'Yoga Mat', price: 199.00, category: 'Sports', image: '🧘', rating: 4.6, reviews: 77, description: 'Eco-friendly non-slip yoga mat with alignment lines and carrying strap for easy transport.' },
  { id: 6, name: 'Desk Lamp', price: 149.00, category: 'Home', image: '💡', rating: 4.2, reviews: 43, description: 'Adjustable LED desk lamp with 5 color temperatures, USB charging port, and touch dimmer control.' },
]

const product = computed(() =>
  allProducts.find((p) => p.id === Number(route.params.id))
)

const quantity = ref(1)
const added = ref(false)

function addToCart() {
  if (!product.value) return
  cartStore.addItem(product.value, quantity.value)
  added.value = true
  setTimeout(() => { added.value = false }, 2000)
}

function buyNow() {
  if (!product.value) return
  cartStore.addItem(product.value, quantity.value)
  router.push('/checkout')
}
</script>

<template>
  <article class="product-view">
    <header class="product-nav">
      <button class="back-btn" @click="router.back()">← Back</button>
    </header>

    <template v-if="product">
      <section class="product-hero">
        <figure class="product-img">
          <span>{{ product.image }}</span>
        </figure>
        <aside class="product-badge">{{ product.category }}</aside>
      </section>

      <section class="product-detail">
        <h1 class="product-name">{{ product.name }}</h1>
        <p class="product-rating">
          <span class="stars">★★★★★</span>
          {{ product.rating }} · {{ product.reviews }} reviews
        </p>
        <p class="product-price">R {{ product.price.toFixed(2) }}</p>
        <p class="product-desc">{{ product.description }}</p>

        <!-- Quantity selector -->
        <section class="quantity-row">
          <span class="qty-label">Quantity</span>
          <aside class="qty-controls">
            <button class="qty-btn" @click="quantity = Math.max(1, quantity - 1)">−</button>
            <span class="qty-value">{{ quantity }}</span>
            <button class="qty-btn" @click="quantity++">+</button>
          </aside>
        </section>

        <!-- Actions -->
        <footer class="product-actions">
          <button class="btn-outline" @click="addToCart">
            {{ added ? '✓ Added!' : 'Add to Cart' }}
          </button>
          <button class="btn-primary buy-btn" @click="buyNow">
            Buy Now
          </button>
        </footer>
      </section>
    </template>

    <aside v-else class="not-found">
      <p>Product not found</p>
      <button @click="router.push('/')" class="btn-primary" style="margin-top:16px">Go Home</button>
    </aside>
  </article>
</template>

<style scoped>
.product-view { padding-bottom: 40px; }

.product-nav { padding: 12px 16px; }
.back-btn { background: none; border: none; font-size: 15px; color: #E60000; cursor: pointer; }

.product-hero {
  position: relative;
  background: linear-gradient(180deg, #F5F5F5, #EBEBEB);
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-img span { font-size: 100px; }
.product-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #E60000;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 12px;
}

.product-detail { padding: 20px 20px 40px; }
.product-name { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
.product-rating { font-size: 13px; color: #888; margin-bottom: 8px; }
.stars { color: #FFB800; }
.product-price { font-size: 28px; font-weight: 800; color: #E60000; margin-bottom: 14px; }
.product-desc { font-size: 14px; line-height: 1.6; color: #555; margin-bottom: 24px; }

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 12px 16px;
}
.qty-label { font-size: 15px; font-weight: 600; }
.qty-controls { display: flex; align-items: center; gap: 16px; }
.qty-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1.5px solid #DDD;
  background: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.qty-value { font-size: 18px; font-weight: 700; min-width: 24px; text-align: center; }

.product-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.btn-outline {
  background: transparent;
  border: 2px solid #E60000;
  color: #E60000;
  border-radius: 26px;
  height: 50px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: #E60000;
  color: #fff;
  border: none;
  border-radius: 26px;
  height: 50px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(230,0,0,0.3);
}

.not-found { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; color: #999; }
</style>