export type InventoryItem = {
  size: string
  quantity: number
}

export type Product = {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  price: number
  image_url: string
  total_stock: number
  available_sizes?: string[]
}

export type ProductDetail = Product & {
  inventory: InventoryItem[]
}

async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal })
  if (!response.ok) {
    throw new Error(response.status === 404 ? 'Product not found.' : 'The catalogue is unavailable right now.')
  }
  return response.json() as Promise<T>
}

export function getProducts(signal?: AbortSignal): Promise<Product[]> {
  return readJson<Product[]>('/api/products', signal)
}

export function getProduct(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return readJson<ProductDetail>(`/api/products/${encodeURIComponent(id)}`, signal)
}

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export function shortDescription(description: string, maxLength = 104): string {
  if (description.length <= maxLength) return description
  const end = description.lastIndexOf(' ', maxLength)
  return `${description.slice(0, end > 0 ? end : maxLength)}…`
}

export function displayDescription(description: string): string {
  return /Vision blocked; filename-based stub/i.test(description)
    ? 'Detailed product information is being updated.'
    : description
}


export type AuthUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string
}

export type RegisterDetails = {
  first_name: string
  last_name: string
  email: string
  password: string
}

export type LoginDetails = {
  email: string
  password: string
}

async function authRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    let detail: unknown
    try {
      const payload = await response.json() as { detail?: unknown }
      detail = payload.detail
    } catch {
      detail = null
    }
    if (typeof detail === 'string') throw new Error(detail)
    if (response.status === 422) throw new Error('Please check the required fields and try again.')
    throw new Error('Account service is unavailable right now. Please try again.')
  }
  return response.json() as Promise<T>
}

export function getCurrentUser(): Promise<{ user: AuthUser | null }> {
  return authRequest<{ user: AuthUser | null }>('/api/auth/me', 'GET')
}

export function registerAccount(details: RegisterDetails): Promise<AuthUser> {
  return authRequest<AuthUser>('/api/auth/register', 'POST', details)
}

export function loginAccount(details: LoginDetails): Promise<AuthUser> {
  return authRequest<AuthUser>('/api/auth/login', 'POST', details)
}

export function logoutAccount(): Promise<{ ok: boolean }> {
  return authRequest<{ ok: boolean }>('/api/auth/logout', 'POST')
}

export type ChatTranscriptMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatProduct = Product & {
  inventory: InventoryItem[]
}

export type ChatResponse = {
  reply: string
  products: ChatProduct[]
  search_performed: boolean
  conversation_id: number | null
}

export type ChatPageContext = {
  page_type: 'home' | 'products' | 'product' | 'about' | 'login' | 'create-account' | 'other'
  product_id?: string
}

export type ChatHistoryMessage = ChatTranscriptMessage & {
  id: number
  products: ChatProduct[]
  search_performed: boolean
  created_at: string
}

export type ChatConversationSummary = {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export type ChatConversation = ChatConversationSummary & {
  messages: ChatHistoryMessage[]
}

async function chatHistoryRequest<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Please log in again to load saved chats.')
    throw new Error('Saved chat history is unavailable right now.')
  }
  return response.json() as Promise<T>
}

export function getChatConversations(): Promise<ChatConversationSummary[]> {
  return chatHistoryRequest<ChatConversationSummary[]>('/api/chat/conversations')
}

export function getChatConversation(id: number): Promise<ChatConversation> {
  return chatHistoryRequest<ChatConversation>(`/api/chat/conversations/${id}`)
}

export async function sendChatMessage(
  messages: ChatTranscriptMessage[],
  conversationId: number | null = null,
  pageContext: ChatPageContext = { page_type: 'other' },
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, conversation_id: conversationId, page_context: pageContext }),
  })
  if (!response.ok) {
    let detail: unknown
    try {
      const payload = await response.json() as { detail?: unknown }
      detail = payload.detail
    } catch {
      detail = null
    }
    if (typeof detail === 'string') throw new Error(detail)
    if (response.status === 422) throw new Error('Please send a message and try again.')
    throw new Error('The shopping assistant is unavailable right now. Please try again.')
  }
  return response.json() as Promise<ChatResponse>
}
