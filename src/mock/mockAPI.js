// src/mock/mockApi.js 
//
// Simulates all backend responses with realistic delays.


// Shared mock data
export const MOCK_USER = {
  id:       'mock-user-001',
  name:     'Thabo Nkosi',
  nickName: 'Thabo Nkosi',
  phone:    '+27 82 555 0101',
  email:    'thabo.nkosi@example.co.za',
  avatar:   '',
  verified: true,
}

export const MOCK_AUTH_CODE = 'MOCK_AUTH_CODE_ABC123XYZ'

let orderCounter = 1000

// ── Simulate network delay ─────────────────────────────────────
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Mock: Exchange auth code → user profile ────────────────────
// Replaces: POST /auth/vodapay { authCode } → { user, token }
export async function mockExchangeAuthCode(authCode) {
  await delay(800)
  if (!authCode) throw new Error('No auth code provided')
  return {
    user:  MOCK_USER,
    token: 'mock-jwt-token-xyz',
  }
}

// ── Mock: Get open user info ───────────────────────────────────
// Replaces: response from my.getOpenUserInfo()
export async function mockGetOpenUserInfo() {
  await delay(400)
  return {
    nickName: MOCK_USER.nickName,
    avatar:   MOCK_USER.avatar,
  }
}

// ── Mock: Create order → tradeNO ──────────────────────────────
// Replaces: POST /orders { items, totalAmount } → { tradeNO, orderId }
export async function mockCreateOrder(orderDetails) {
  await delay(1000)
  orderCounter++
  return {
    tradeNO: `VP${Date.now()}${orderCounter}`,
    orderId: `ORD-${orderCounter}`,
  }
}

// ── Mock: Fetch order history ──────────────────────────────────
// Replaces: GET /orders
export async function mockFetchOrders() {
  await delay(600)
  return [
    { id: 'ORD-0998', date: '2025-02-10', total: 1999.00, status: 'Delivered',  items: 1, tradeNO: 'VP16000000010998' },
    { id: 'ORD-0999', date: '2025-02-18', total:  449.00, status: 'In Transit', items: 1, tradeNO: 'VP16000000010999' },
  ]
}
