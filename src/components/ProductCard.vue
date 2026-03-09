<!--src/components/ProductCard.vue-->
<script setup>
const props = defineProps({
  product: { type: Object, required: true },
})

const emit = defineEmits(['add-to-cart', 'view-product'])
</script>

<template>
  <article class="product-card" @click="emit('view-product', product)">
    <figure class="product-image">
      <span class="product-emoji">{{ product.image }}</span>
    </figure>
    <section class="product-info">
      <h4 class="product-name">{{ product.name }}</h4>
      <p class="product-rating">
        <span class="stars">★</span> {{ product.rating }} ({{ product.reviews }})
      </p>
      <p class="product-price">R {{ product.price.toFixed(2) }}</p>
    </section>
    <button
      class="add-btn"
      @click.stop="emit('add-to-cart', product)"
      aria-label="Add to cart"
    >
      +
    </button>
  </article>
</template>

<style scoped>
.product-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
}
.product-card:active { transform: scale(0.97); }

.product-image {
  background: linear-gradient(135deg, #fafafa, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
}
.product-emoji { font-size: 52px; }

.product-info { padding: 10px 12px 8px; }

.product-name {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-rating { font-size: 11px; color: #999; margin-bottom: 4px; }
.stars { color: #FFB800; }

.product-price {
  font-size: 15px;
  font-weight: 700;
  color: #E60000;
}

.add-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E60000;
  color: #fff;
  border: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(230,0,0,0.35);
}
</style>