import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { displayDescription, formatPrice, getChatConversation, getChatConversations, getCurrentUser, getProduct, getProducts, loginAccount, logoutAccount, registerAccount, sendChatMessage, shortDescription } from './api'
import type { AuthUser, ChatConversationSummary, ChatHistoryMessage, ChatPageContext, ChatProduct, ChatTranscriptMessage, LoginDetails, Product, ProductDetail, RegisterDetails } from './api'
import './App.css'
import './brand.css'

type ChatSearchResults = { query: string; products: ChatProduct[] }
type CatalogueState = {
  products: Product[]
  loading: boolean
  error: string | null
  chatSearchResults: ChatSearchResults | null
  setChatSearchResults: (results: ChatSearchResults | null) => void
}
const CatalogueContext = createContext<CatalogueState>({
  products: [],
  loading: true,
  error: null,
  chatSearchResults: null,
  setChatSearchResults: () => undefined,
})

const arrow = <span aria-hidden="true">↗</span>
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const CURRENT_YEAR = new Date().getFullYear()

function CatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ products: [] as Product[], loading: true, error: null as string | null })
  const [chatSearchResults, setChatSearchResults] = useState<ChatSearchResults | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    getProducts(controller.signal)
      .then((products) => setState({ products, loading: false, error: null }))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setState({ products: [], loading: false, error: error.message })
      })
    return () => controller.abort()
  }, [])
  return <CatalogueContext.Provider value={{ ...state, chatSearchResults, setChatSearchResults }}>{children}</CatalogueContext.Provider>
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (details: LoginDetails) => Promise<AuthUser>
  register: (details: RegisterDetails) => Promise<AuthUser>
  logout: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const { setChatSearchResults } = useCatalogue()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(details) {
      const currentUser = await loginAccount(details)
      setUser(currentUser)
      setChatSearchResults(null)
      return currentUser
    },
    async register(details) {
      const currentUser = await registerAccount(details)
      setUser(currentUser)
      setChatSearchResults(null)
      return currentUser
    },
    async logout() {
      await logoutAccount()
      setUser(null)
      setChatSearchResults(null)
    },
  }), [user, loading, setChatSearchResults])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}

function useCatalogue() {
  return useContext(CatalogueContext)
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const nav = [
    ['/', 'Home'],
    ['/products', 'Products'],
    ['/about', 'About Us'],
    ['/login', user ? 'My account' : 'Log in'],
  ]
  return (
    <>
      <div className="announcement"><span className="announcement-star">✦</span> YALE STYLE, MADE YOURS <span className="announcement-star">✦</span></div>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Campus Customs home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">C<span>✦</span></span>
          <span className="brand-words"><strong>CAMPUS<br />CUSTOMS</strong><small>NEW HAVEN, CT</small></span>
        </Link>
        <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="primary-nav" aria-label={menuOpen ? 'Close main menu' : 'Open main menu'} onClick={() => setMenuOpen((open) => !open)}>
          <span>{menuOpen ? 'Close' : 'Menu'}</span><span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>
        <nav id="primary-nav" className={`main-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {nav.map(([path, label]) => (
            <NavLink key={path} end={path === '/'} to={path} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>
          ))}
          {user ? <button type="button" className="nav-signup nav-signout" onClick={() => { setMenuOpen(false); void logout().catch(() => undefined) }}>Log out {arrow}</button> : <NavLink to="/create-account" onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-signup ${isActive ? 'active' : ''}`}>Create account {arrow}</NavLink>}
        </nav>
      </header>
    </>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand">CAMPUS<br />CUSTOMS<span>✦</span></div>
          <p>For the campus days, the game days,<br />and everywhere Yale takes you.</p>
        </div>
        <div className="footer-links"><span>EXPLORE</span><Link to="/products">Shop all products</Link><Link to="/about">Our story</Link><Link to="/login">Your account</Link></div>
        <div className="footer-links"><span>FIND US</span><p>57 Broadway<br />New Haven, CT 06511</p><a href="https://yalebulldogblue.com/" target="_blank" rel="noreferrer">Yale Bulldog Blue {arrow}</a></div>
      </div>
      <div className="footer-bottom"><span>© {CURRENT_YEAR} Campus Customs</span><span>Made for your Yale story.</span></div>
    </footer>
  )
}

function ProductPhoto({ product, className = '', eager = false }: { product: Product; className?: string; eager?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = failedUrl === product.image_url
  return (
    <div className={`product-photo ${className}`}>
      {failed ? <div className="image-fallback">Campus<br />Customs</div> :
        <img src={product.image_url} alt={product.name} loading={eager ? 'eager' : 'lazy'} onError={() => setFailedUrl(product.image_url)} />}
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="product-card" to={`/products/${encodeURIComponent(product.product_id)}`}>
      <div className="product-card-image">
        <ProductPhoto product={product} />
        <span className={`stock-pill ${product.total_stock === 0 ? 'sold-out' : ''}`}>{product.total_stock > 0 ? 'IN STOCK' : 'SOLD OUT'}</span>
        <span className="card-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="product-card-meta"><span>{product.garment_type}</span><span>{formatPrice(product.price)}</span></div>
      <h3>{product.name}</h3>
      <p>{shortDescription(displayDescription(product.description))}</p>
    </Link>
  )
}

function ChatSearchShelf({ results, onClear }: { results: ChatSearchResults; onClear: () => void }) {
  return <section className="chat-search-shelf section-shell" id="chat-search-results" aria-labelledby="chat-search-title">
    <div className="chat-search-heading">
      <div><span className="eyebrow">FOUND THROUGH CHAT</span><h2 id="chat-search-title">Products for “{shortDescription(results.query, 72)}”</h2><p>{results.products.length} {results.products.length === 1 ? 'match' : 'matches'} from the Campus Customs catalogue.</p></div>
      <button className="chat-search-clear" type="button" onClick={onClear}>Clear results</button>
    </div>
    {results.products.length > 0
      ? <div className="product-grid">{results.products.map((product) => <ProductCard key={product.product_id} product={product} />)}</div>
      : <div className="empty-state"><h3>No matching pieces found.</h3><p>Try another product type, color, or style in the chat.</p></div>}
  </section>
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>
}

function Home() {
  const { products, loading, error, chatSearchResults, setChatSearchResults } = useCatalogue()
  const heroProduct = products.find((item) => item.product_id === 'basic-hoodie-big-yale') ?? products[0]
  const secondProduct = products.find((item) => item.product_id === 'yale-grandpa-crewneck') ?? products[1]
  const featuredIds = ['basic-hoodie-big-yale', '2025-yale-vs-harvard-t-shirt', 'yale-grandpa-crewneck', 'brooks-brothers-double-knit-full-zip-hoodie-yale']
  const featured = featuredIds.map((id) => products.find((item) => item.product_id === id)).filter((item): item is Product => Boolean(item))
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow"><span className="line" /> CAMPUS CUSTOMS · NEW HAVEN</span>
          <h1>Wear the<br /><em>moment.</em></h1>
          <p>Yale looks different on everyone. Find the piece that feels like your campus story.</p>
          <div className="hero-actions"><Link className="button button-light" to="/products">Explore the collection {arrow}</Link><Link className="text-link light" to="/about">Get to know us <span aria-hidden="true">→</span></Link></div>
          <div className="hero-index"><span>01 / THE YALE EDIT</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="hero-visual">
          {heroProduct && <Link className="hero-main-product" to={`/products/${encodeURIComponent(heroProduct.product_id)}`}><ProductPhoto product={heroProduct} eager /><span className="hero-caption"><span>{heroProduct.name}</span><strong>{formatPrice(heroProduct.price)} ↗</strong></span></Link>}
          {secondProduct && <Link className="hero-small-product" to={`/products/${encodeURIComponent(secondProduct.product_id)}`}><ProductPhoto product={secondProduct} /><span>THE EVERYDAY EDIT ↗</span></Link>}
          {loading && <div className="hero-image-placeholder">LOADING THE COLLECTION…</div>}
          {error && <div className="hero-image-placeholder">THE COLLECTION IS UNAVAILABLE</div>}
          <div className="hero-decoration">Y</div>
        </div>
      </section>
      <div className="marquee" aria-label="Campus Customs collection themes"><div>THE CAMPUS EDIT <span>✦</span> EVERYDAY BLUE <span>✦</span> MADE TO REP YALE <span>✦</span> THE CAMPUS EDIT <span>✦</span> EVERYDAY BLUE <span>✦</span></div></div>
      {chatSearchResults && <ChatSearchShelf results={chatSearchResults} onClear={() => setChatSearchResults(null)} />}
      <section className="home-feature section-shell">
        <SectionHeading eyebrow="01 / FROM THE COLLECTION" title="Your next favorite layer." action={<Link className="text-link" to="/products">Shop all {arrow}</Link>} />
        {error ? <ErrorState message={error} /> : loading ? <div className="loading-grid">Loading real products…</div> : <div className="product-grid featured-grid">{featured.map((item) => <ProductCard key={item.product_id} product={item} />)}</div>}
      </section>
      <section className="story-band">
        <div className="story-band-word">BLUE IS<br /><em>A FEELING.</em></div>
        <div className="story-band-copy"><span className="eyebrow">ROOTED IN NEW HAVEN</span><p>From early lectures to late nights and everything in between, the best pieces become part of the story. We're here for the ones you'll keep reaching for.</p><Link className="button button-outline" to="/about">More about us {arrow}</Link></div>
      </section>
      <section className="home-bottom section-shell"><span className="eyebrow">THE COLLECTION</span><h2>Find something that feels like <em>you.</em></h2><Link className="button button-dark" to="/products">Browse all {products.length || ''} products {arrow}</Link></section>
    </main>
  )
}

function ErrorState({ message }: { message: string }) {
  return <div className="error-state"><strong>We couldn't load the collection.</strong><span>{message} Make sure the local product server is running, then refresh this page.</span></div>
}

function Products() {
  const { products, loading, error, chatSearchResults, setChatSearchResults } = useCatalogue()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [minimumPrice, setMinimumPrice] = useState('')
  const [maximumPrice, setMaximumPrice] = useState('')
  const [sizeFilter, setSizeFilter] = useState<string | null>(null)
  const [sort, setSort] = useState('featured')
  const categoryOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.garment_type))).sort((a, b) => a.localeCompare(b)),
    [products],
  )
  const sizeOptions = useMemo(
    () => SIZE_ORDER.filter((size) => products.some((product) => product.available_sizes?.includes(size))),
    [products],
  )
  const lowerPrice = minimumPrice === '' ? null : Number(minimumPrice)
  const upperPrice = maximumPrice === '' ? null : Number(maximumPrice)
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = products.filter((item) =>
      (category === 'all' || item.garment_type === category)
      && (lowerPrice === null || item.price >= lowerPrice)
      && (upperPrice === null || item.price <= upperPrice)
      && (sizeFilter === null || item.available_sizes?.includes(sizeFilter))
      && (!normalized || [item.name, item.description, item.garment_type, ...item.search_tags].join(' ').toLowerCase().includes(normalized)),
    )
    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price)
    if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name))
    return filtered
  }, [products, query, category, lowerPrice, upperPrice, sizeFilter, sort])
  const clearFilters = () => {
    setQuery('')
    setCategory('all')
    setMinimumPrice('')
    setMaximumPrice('')
    setSizeFilter(null)
    setSort('featured')
  }
  const hasActiveFilters = Boolean(query || category !== 'all' || minimumPrice || maximumPrice || sizeFilter || sort !== 'featured')

  return (
    <main>
      <section className="page-intro products-intro"><div className="section-shell"><span className="eyebrow">CAMPUS CUSTOMS / SHOP</span><h1>The Yale<br /><em>collection.</em></h1><p>Easy to wear. Hard to leave behind. Explore pieces for every kind of Bulldog.</p><span className="page-intro-stamp">{products.length ? `${products.length} PIECES. INFINITE STORIES.` : 'THE YALE EDIT'}</span></div></section>
      {chatSearchResults && <ChatSearchShelf results={chatSearchResults} onClear={() => setChatSearchResults(null)} />}
      <section className="catalogue-section section-shell">
        <div className="catalogue-toolbar"><div><span className="eyebrow">THE FULL EDIT</span><h2>Find your fit.</h2></div><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search the collection" aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <div className="catalogue-filters" aria-label="Product filters">
          <label className="catalogue-filter-control"><span>Category</span><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <div className="price-filter"><span className="filter-control-label">Price range (USD)</span><div className="price-inputs"><label><span className="visually-hidden">Minimum price in dollars</span><input type="number" min="0" step="1" inputMode="numeric" placeholder="Min" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} /></label><label><span className="visually-hidden">Maximum price in dollars</span><input type="number" min="0" step="1" inputMode="numeric" placeholder="Max" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} /></label></div></div>
          <fieldset className="size-filter"><legend>Size in stock</legend><div className="size-filter-options"><button type="button" className={sizeFilter === null ? 'size-filter-button selected' : 'size-filter-button'} aria-pressed={sizeFilter === null} onClick={() => setSizeFilter(null)}>Any</button>{sizeOptions.map((size) => <button key={size} type="button" className={sizeFilter === size ? 'size-filter-button selected' : 'size-filter-button'} aria-pressed={sizeFilter === size} onClick={() => setSizeFilter((current) => current === size ? null : size)}>{size}</button>)}</div></fieldset>
          <label className="sort-field">Sort by <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
        </div>
        <div className="results-line"><span role="status">{loading ? 'Loading products…' : `${visible.length} ${visible.length === 1 ? 'product' : 'products'}`}</span><button type="button" className="clear-filters" onClick={clearFilters} disabled={!hasActiveFilters}>Clear filters</button><span>REAL PIECES. REAL YALE SPIRIT.</span></div>
        {error ? <ErrorState message={error} /> : loading ? <div className="loading-grid">Loading the collection…</div> : visible.length ? <div className="product-grid">{visible.map((item) => <ProductCard key={item.product_id} product={item} />)}</div> : <div className="empty-state"><h3>No pieces match these filters.</h3><p>Try a different search, category, price, or size.</p><button type="button" className="button button-dark" onClick={clearFilters}>Reset filters</button></div>}
      </section>
    </main>
  )
}

function ProductPage() {
  const { productId } = useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  useEffect(() => {
    if (!productId) return
    const controller = new AbortController()
    getProduct(productId, controller.signal)
      .then((result) => { setProduct(result); setLoading(false); setError(null) })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') { setError(reason.message); setLoading(false) } })
    return () => controller.abort()
  }, [productId])
  useEffect(() => { if (product) document.title = `${product.name} | Campus Customs`; return () => { document.title = 'Campus Customs | Yale style, your way' } }, [product])
  const selected = product?.inventory.find((item) => item.size === size)
  return <main className="detail-page section-shell">
    <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/products">Products</Link><span>/</span><span>{product?.name ?? 'Product'}</span></div>
    {loading ? <div className="loading-grid">Loading product…</div> : error || !product ? <div className="error-state"><strong>We couldn't find this product.</strong><span>{error}</span><Link to="/products">Back to products →</Link></div> : <>
      <div className="detail-layout"><div className="detail-image-wrap"><ProductPhoto product={product} className="detail-photo" eager /><span className="detail-image-stamp">CAMPUS CUSTOMS · YALE</span></div><div className="detail-info"><span className="eyebrow">THE YALE COLLECTION / {product.garment_type.toUpperCase()}</span><h1>{product.name}</h1><div className="detail-price-row"><span className="detail-price">{formatPrice(product.price)}</span><span className={product.total_stock > 0 ? 'detail-stock' : 'detail-stock unavailable'}><i />{product.total_stock > 0 ? 'Available' : 'Currently out of stock'}</span></div><div className="detail-divider" /><h2>The details</h2><p className="detail-description">{displayDescription(product.description)}</p><div className="detail-colors"><span className="eyebrow">COLORS IN THIS DESIGN</span><div>{product.colors.map((color) => <span key={color}>{color}</span>)}</div></div><div className="detail-divider" /><div className="size-heading"><span className="eyebrow">SIZE AVAILABILITY</span><span>Live from our local inventory</span></div><div className="size-grid">{SIZE_ORDER.filter((label) => product.inventory.some((item) => item.size === label)).map((label) => { const item = product.inventory.find((entry) => entry.size === label)!; return <button key={label} type="button" className={`size-option ${size === label ? 'selected' : ''}`} disabled={item.quantity === 0} onClick={() => setSize(label)} aria-label={`${label}, ${item.quantity === 0 ? 'out of stock' : `${item.quantity} available`}`}><strong>{label}</strong><small>{item.quantity === 0 ? 'Sold out' : `${item.quantity} left`}</small></button> })}</div><p className="size-note" aria-live="polite">{selected ? `${selected.quantity} ${selected.quantity === 1 ? 'piece' : 'pieces'} available in size ${selected.size}.` : 'Choose a size to check availability.'}</p><div className="detail-bottom-note">Every piece in this collection comes from the Campus Customs catalogue. Price and availability are shown from the current local database.</div></div></div>
      <div className="detail-return"><Link className="text-link" to="/products">← Back to the collection</Link></div>
    </>}
  </main>
}

function About() {
  const { products } = useCatalogue()
  const imageProduct = products.find((item) => item.product_id === 'yale-grandpa-crewneck') ?? products[0]
  return <main><section className="about-hero"><div className="section-shell about-hero-grid"><div><span className="eyebrow">OUR STORY / CAMPUS CUSTOMS</span><h1>More than<br /><em>merch.</em></h1><p>A little blue can hold a lot of meaning. We're here for the pieces that go with you from your first walk across campus to every visit back.</p></div><div className="about-hero-graphic"><span>EST. IN THE HEART OF<br />NEW HAVEN</span><strong>CC<span>✦</span></strong></div></div></section><section className="about-story section-shell"><div className="about-image">{imageProduct ? <ProductPhoto product={imageProduct} /> : <div className="image-fallback">Campus Customs</div>}<span>WEAR YOUR YALE STORY</span></div><div className="about-copy"><span className="eyebrow">A COLLECTION WITH CHARACTER</span><h2>For where you've been. <em>And what's next.</em></h2><p>Campus Customs brings together Yale-inspired apparel that fits the everyday, not just the occasion. Find a classic crewneck for a quiet morning, a bold hoodie for game day, or a piece that reminds you of the people and places that made campus yours.</p><p>Explore by style, color, or the name you know. Every item you see in our shop comes from our current catalogue, with product details and size availability shown right on the page.</p><Link className="button button-dark" to="/products">Find your piece {arrow}</Link></div></section><section className="visit-banner"><div className="section-shell"><span className="eyebrow">COME SEE US</span><h2>Meet us on <em>Broadway.</em></h2><p>57 Broadway, New Haven, CT 06511</p><a href="https://maps.google.com/?q=57+Broadway+New+Haven+CT+06511" target="_blank" rel="noreferrer">Get directions {arrow}</a></div></section></main>
}

function AccountPage({ mode }: { mode: 'login' | 'create' }) {
  const create = mode === 'create'
  const { user, loading, login, register, logout } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (create && password !== confirmPassword) {
      setError('The passwords do not match. Please check them and try again.')
      return
    }
    setSubmitting(true)
    try {
      if (create) {
        await register({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim().toLowerCase(), password })
      } else {
        await login({ email: email.trim().toLowerCase(), password })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account request failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="account-page"><div className="account-visual"><div><span className="eyebrow">CAMPUS CUSTOMS</span><h1>Your Yale<br /><em>starts here.</em></h1><p>Save your favorites and make the collection yours.</p></div><div className="account-visual-mark">C<span>✦</span></div></div><div className="account-panel"><div className="account-card"><span className="eyebrow">YOUR ACCOUNT</span>
    {loading ? <><h2>Checking your account.</h2><p>Please wait a moment.</p></> : user ? <div className="account-signed-in" role="status"><span className="account-status-label">ACCOUNT ACTIVE</span><h2>Welcome, {user.first_name}.</h2><p>Signed in as <strong>{user.email}</strong></p><Link className="button button-dark" to="/products">Browse the collection {arrow}</Link><button type="button" className="account-logout" onClick={() => { void logout().catch((reason: Error) => setError(reason.message)) }}>Log out</button></div> : <>
      <h2>{create ? 'Create account.' : 'Welcome back.'}</h2><p>{create ? 'A home for your favorite finds.' : 'Good to see you again.'}</p>
      {error && <div className="account-feedback account-feedback-error" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate={false}>
        {create && <div className="account-name-fields"><label>First name<input type="text" name="first_name" autoComplete="given-name" placeholder="First name" required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label>Last name<input type="text" name="last_name" autoComplete="family-name" placeholder="Last name" required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label></div>}
        <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" name="password" autoComplete={create ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required minLength={create ? 8 : 1} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} />{create && <small className="account-field-hint">Use at least 8 characters.</small>}</label>
        {create && <label>Confirm password<input type="password" name="confirm_password" autoComplete="new-password" placeholder="Enter your password again" required minLength={8} maxLength={256} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
        <button type="submit" className="button button-dark" disabled={submitting}>{submitting ? 'Please wait…' : create ? 'Create account' : 'Log in'} {arrow}</button>
      </form>
      <div className="account-notice">Your password is protected and never shown in your account details.</div>
      <p className="account-switch">{create ? 'Already have an account?' : 'New to Campus Customs?'} <Link to={create ? '/login' : '/create-account'}>{create ? 'Log in' : 'Create account'} →</Link></p>
    </>}
  </div></div></main>
}

function NotFound() {
  return <main className="not-found section-shell"><span className="eyebrow">404 / LOST ON CAMPUS?</span><h1>This page stepped out.</h1><p>Let's get you back to the good stuff.</p><Link className="button button-dark" to="/products">Browse products {arrow}</Link></main>
}

type ChatBubble = {
  id: number
  role: 'user' | 'assistant'
  text: string
  products?: ChatProduct[]
  searchPerformed?: boolean
  includedInContext: boolean
  historical?: boolean
}

function toChatBubble(message: ChatHistoryMessage): ChatBubble {
  return {
    id: message.id,
    role: message.role,
    text: message.content,
    products: message.products,
    searchPerformed: message.search_performed,
    includedInContext: true,
    historical: true,
  }
}

function ChatWidget() {
  const { user, loading } = useAuth()
  return <ChatSession key={user?.id ?? 'guest'} user={user} authLoading={loading} />
}

function ChatSession({ user, authLoading }: { user: AuthUser | null; authLoading: boolean }) {
  const location = useLocation()
  const { setChatSearchResults } = useCatalogue()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(user !== null)
  const [error, setError] = useState<string | null>(null)
  const userId = user?.id ?? null
  const nextId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    if (userId === null) return () => { active = false }
    async function restoreLatestConversation() {
      try {
        const saved = await getChatConversations()
        if (!active) return
        setConversations(saved)
        if (saved.length === 0) return
        const conversation = await getChatConversation(saved[0].id)
        if (!active) return
        const restoredMessages = conversation.messages.map(toChatBubble)
        setConversationId(conversation.id)
        setMessages(restoredMessages)
        nextId.current = restoredMessages.reduce((highest, message) => Math.max(highest, message.id), 0)
        const lastSearchIndex = restoredMessages.map((message) => message.role === 'assistant' && message.searchPerformed).lastIndexOf(true)
        if (lastSearchIndex >= 0) {
          const assistantMessage = restoredMessages[lastSearchIndex]
          const query = [...restoredMessages.slice(0, lastSearchIndex)].reverse().find((message) => message.role === 'user')?.text ?? conversation.title
          setChatSearchResults({ query, products: assistantMessage.products ?? [] })
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Saved chat history is unavailable right now.')
      } finally {
        if (active) setHistoryLoading(false)
      }
    }
    void restoreLatestConversation()
    return () => { active = false }
  }, [userId, setChatSearchResults])

  useEffect(() => {
    if (open && !pending && !historyLoading) inputRef.current?.focus()
  }, [open, pending, historyLoading])
  useEffect(() => {
    if (open) endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, pending, error])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || pending || historyLoading || authLoading) return

    const userId = ++nextId.current
    const userMessage: ChatBubble = {
      id: userId,
      role: 'user',
      text,
      includedInContext: false,
    }
    const transcript: ChatTranscriptMessage[] = messages
      .filter((message) => message.includedInContext)
      .map((message): ChatTranscriptMessage => ({ role: message.role, content: message.text }))
    transcript.push({ role: 'user', content: text })
    if (transcript.length > 24) transcript.splice(0, transcript.length - 24)
    while (transcript[0]?.role !== 'user') transcript.shift()

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setPending(true)
    setError(null)
    try {
      const pageContext = resolveChatPageContext(location.pathname)
      const response = await sendChatMessage(transcript, conversationId, pageContext)
      if (response.conversation_id !== null) setConversationId(response.conversation_id)
      if (response.search_performed) {
        setChatSearchResults({ query: text, products: response.products })
      }
      setMessages((current) => [
        ...current.map((message) => message.id === userId
          ? { ...message, includedInContext: true }
          : message),
        {
          id: ++nextId.current,
          role: 'assistant',
          text: response.reply,
          products: response.products,
          searchPerformed: response.search_performed,
          includedInContext: true,
        },
      ])
      if (userId !== null && response.conversation_id !== null) {
        getChatConversations().then(setConversations).catch(() => undefined)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The shopping assistant is unavailable right now.')
    } finally {
      setPending(false)
    }
  }

  async function openConversation(id: number) {
    if (pending || historyLoading || authLoading) return
    setHistoryLoading(true)
    setError(null)
    try {
      const conversation = await getChatConversation(id)
      const restoredMessages = conversation.messages.map(toChatBubble)
      setConversationId(conversation.id)
      setMessages(restoredMessages)
      nextId.current = restoredMessages.reduce((highest, message) => Math.max(highest, message.id), 0)
      setChatSearchResults(null)
      const lastSearchIndex = restoredMessages.map((message) => message.role === 'assistant' && message.searchPerformed).lastIndexOf(true)
      if (lastSearchIndex >= 0) {
        const assistantMessage = restoredMessages[lastSearchIndex]
        const query = [...restoredMessages.slice(0, lastSearchIndex)].reverse().find((message) => message.role === 'user')?.text ?? conversation.title
        setChatSearchResults({ query, products: assistantMessage.products ?? [] })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Saved chat history is unavailable right now.')
    } finally {
      setHistoryLoading(false)
    }
  }

  function startNewConversation() {
    if (pending || historyLoading || authLoading) return
    setConversationId(null)
    setMessages([])
    setError(null)
    setChatSearchResults(null)
    nextId.current = 0
  }

  function renderProduct(product: ChatProduct) {
    return <Link
      className="chat-product-card"
      key={product.product_id}
      to={`/products/${encodeURIComponent(product.product_id)}`}
      onClick={() => setOpen(false)}
    >
      <span className="chat-product-thumb"><ProductPhoto product={product} /></span>
      <span className="chat-product-copy">
        <strong>{product.name}</strong>
        <span>{formatPrice(product.price)} · {product.total_stock > 0 ? `${product.total_stock} in stock` : 'Sold out'}</span>
        <span className="chat-product-description">{shortDescription(displayDescription(product.description), 76)}</span>
        <span className="chat-product-sizes">{product.inventory.map((item) => `${item.size} ${item.quantity}`).join(' · ')}</span>
      </span>
      <span className="chat-product-arrow" aria-hidden="true">↗</span>
    </Link>
  }

  return (
    <div className={`chat-widget ${open ? 'is-open' : ''}`}>
      {open && <section className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" aria-busy={pending || historyLoading || authLoading}>
        <header className="chat-panel-header">
          <span className="chat-brand-mark" aria-hidden="true">C<span>✦</span></span>
          <div className="chat-header-copy"><strong id="chat-title">Campus Customs</strong><span>Shopping assistant</span></div>
          <button className="chat-close" type="button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
        </header>
        {user && <div className="chat-history-toolbar">
          <label className="visually-hidden" htmlFor="saved-chat-select">Saved conversations</label>
          <select id="saved-chat-select" value={conversationId ?? ''} disabled={pending || historyLoading} onChange={(event) => {
            const id = Number(event.currentTarget.value)
            if (id > 0) void openConversation(id)
            else startNewConversation()
          }}>
            <option value="">New chat</option>
            {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
          </select>
          <button type="button" disabled={pending || historyLoading || (conversationId === null && messages.length === 0)} onClick={startNewConversation}>New chat</button>
        </div>}
        <div className="chat-preview-note"><span className={pending || historyLoading ? 'chat-status-dot is-working' : 'chat-status-dot'} aria-hidden="true">●</span>{pending ? 'Checking the catalogue…' : historyLoading || authLoading ? 'Loading your saved chats…' : user ? 'Your conversations are private to your account.' : 'Product details are checked against our catalogue.'}</div>
        <div className="chat-thread" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && !historyLoading && <div className="chat-welcome"><span className="chat-welcome-label">CAMPUS CUSTOMS ASSISTANT</span><p>Hi there! Ask me about products, prices, colors, or available sizes.</p><time>Just now</time></div>}
          {messages.map((message) => message.role === 'user'
            ? <div className="chat-user-message" key={message.id}>{message.text}</div>
            : <div className="chat-assistant-message" key={message.id}>
                {message.historical && <span className="chat-saved-note">Saved reply · prices and stock may have changed; check the product page for current details.</span>}
                <p>{message.text}</p>
                {message.products && message.products.length > 0 && <div className="chat-product-list">{message.products.map(renderProduct)}</div>}
                {message.searchPerformed && message.products && message.products.length > 0 && <Link className="chat-results-link" to="/products" onClick={() => setOpen(false)}>See all {message.products.length} matching products →</Link>}
              </div>)}
          {pending && <div className="chat-thinking" role="status">Checking the catalogue…</div>}
          {error && <div className="chat-error-note" role="alert">{error}</div>}
          <div ref={endOfMessagesRef} />
        </div>
        <form className="chat-composer" onSubmit={sendMessage}>
          <label className="visually-hidden" htmlFor="chat-message">Type a message</label>
          <input ref={inputRef} id="chat-message" type="text" maxLength={4000} placeholder={pending || historyLoading || authLoading ? 'One moment…' : 'Type your message…'} value={draft} disabled={pending || historyLoading || authLoading} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" aria-label="Send message" disabled={pending || historyLoading || authLoading || !draft.trim()}><span aria-hidden="true">↗</span></button>
        </form>
      </section>}
      <button className="chat-launcher" type="button" aria-label={open ? 'Close Campus Customs chat' : 'Open Campus Customs chat'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <span className="chat-launcher-close" aria-hidden="true">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.1A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 11h.01M12 11h.01M16 11h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>}
        {!open && <span className="chat-launcher-label">Chat with us</span>}
      </button>
    </div>
  )
}

function resolveChatPageContext(pathname: string): ChatPageContext {
  if (pathname === '/') return { page_type: 'home' }
  if (pathname === '/products') return { page_type: 'products' }
  if (pathname === '/about') return { page_type: 'about' }
  if (pathname === '/login') return { page_type: 'login' }
  if (pathname === '/create-account') return { page_type: 'create-account' }
  const productMatch = pathname.match(/^\/products\/([^/]+)\/?$/)
  if (productMatch) {
    try {
      return { page_type: 'product', product_id: decodeURIComponent(productMatch[1]) }
    } catch {
      return { page_type: 'product' }
    }
  }
  return { page_type: 'other' }
}

function App() {
  return <BrowserRouter><CatalogueProvider><AuthProvider><ScrollToTop /><Header /><Routes><Route path="/" element={<Home />} /><Route path="/products" element={<Products />} /><Route path="/products/:productId" element={<ProductPage />} /><Route path="/about" element={<About />} /><Route path="/login" element={<AccountPage mode="login" />} /><Route path="/create-account" element={<AccountPage mode="create" />} /><Route path="*" element={<NotFound />} /></Routes><Footer /><ChatWidget /></AuthProvider></CatalogueProvider></BrowserRouter>
}

export default App
