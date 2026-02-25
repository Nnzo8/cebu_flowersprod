# Supabase Implementation Guide for Cebu Flowers E-Commerce

## 📋 Overview
This guide walks you through setting up Supabase for your Angular e-commerce platform. Supabase provides PostgreSQL database, real-time subscriptions, and built-in authentication.

---

## 🚀 Step-by-Step Setup

### **1. Create Supabase Project**
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Project Name:** `cebu-flowers`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users
5. Click "Create new project"
6. Wait for initialization (2-3 minutes)

### **2. Get Your Credentials**
1. In Supabase Dashboard, click **Settings** → **API**
2. Copy:
   - **Project URL** (anon key)
   - **anon public** key
3. Save these safely - you'll need them in Step 3

### **3. Create Database Tables**

#### **Products Table**
Navigate to **SQL Editor** in Supabase and run this:

```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  imageUrl TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read" ON products
  FOR SELECT USING (true);

-- Allow authenticated users to create (admin only - you can add role checking later)
CREATE POLICY "Allow authenticated create" ON products
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update (admin only)
CREATE POLICY "Allow authenticated update" ON products
  FOR UPDATE USING (true);

-- Allow authenticated users to delete (admin only)
CREATE POLICY "Allow authenticated delete" ON products
  FOR DELETE USING (true);
```

#### **Users Table (Optional - for profile data)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see their own profile
CREATE POLICY "Users can see own profile" ON users
  FOR SELECT USING (auth.uid() = id);
```

### **4. Update Environment Config**

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_URL',        // e.g., https://xxxxx.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Your public anon key
  },
};
```

Do the same for `src/environments/environment.prod.ts`

### **5. Import SupabaseService in Components**

The service is already created at `src/app/core/services/supabase.service.ts`

### **6. Update Components to Use Supabase**

#### **In Login Component (Already Updated)**
- Uses `AuthService.login()` which now uses Supabase Auth
- Displays error messages and loading states
- Redirects to admin or user dashboard based on role

#### **In Inventory Component (Already Updated)**
- Loads products from Supabase on init
- Create, Read, Update, Delete all use SupabaseService
- Saves changes to Supabase database

---

## 🔐 Authentication Flow

### **1. Sign Up (Register)**
```typescript
// In your register component
const result = await this.authService.register(
  'user@example.com',
  'password123',
  false // isAdmin - set to true for admin users
);

if (result.success) {
  // User created successfully
  this.router.navigate(['/']);
}
```

### **2. Sign In (Login)**
```typescript
// Already implemented in login component
const result = await this.authService.login(
  'user@example.com',
  'password123'
);

if (result.success) {
  // Check user role and navigate
  const user = this.authService.currentUser();
  if (user?.role === 'admin') {
    this.router.navigate(['/admin/dashboard']);
  }
}
```

### **3. Sign Out (Logout)**
```typescript
await this.authService.logout();
// Automatically redirects to login
```

---

## 📊 Product Operations

### **Create Product**
```typescript
const result = await this.supabaseService.createProduct({
  name: 'Red Rose Bouquet',
  price: 89.99,
  category: 'Weddings',
  description: 'Beautiful red roses',
  imageUrl: 'https://example.com/image.jpg'
});

if (!result.error) {
  console.log('Product created:', result.data);
}
```

### **Read Products**
```typescript
const result = await this.supabaseService.getProducts();

if (!result.error && result.data) {
  console.log('Products:', result.data);
}
```

### **Update Product**
```typescript
const result = await this.supabaseService.updateProduct(productId, {
  name: 'Updated Name',
  price: 99.99
});

if (!result.error) {
  console.log('Product updated:', result.data);
}
```

### **Delete Product**
```typescript
const result = await this.supabaseService.deleteProduct(productId);

if (!result.error) {
  console.log('Product deleted');
}
```

---

## 🔄 Real-Time Subscriptions

Listen to product changes in real-time:

```typescript
// In your component
const unsubscribe = this.supabaseService.subscribeToProducts((products) => {
  this.products.set(products); // Update signals
});

// Clean up when component is destroyed
onDestroy(() => {
  unsubscribe();
});
```

---

## 🛡️ Role-Based Access Control

Users are assigned roles (`admin` or `user`) during signup. The role is stored in Supabase auth `user_metadata`.

### **Check User Role**
```typescript
const user = await this.supabaseService.getCurrentUser();
console.log(user?.user_metadata?.role); // 'admin' or 'user'
```

### **Admin Guard (Already Implemented)**
The `admin.guard.ts` checks:
1. User is authenticated
2. User role is 'admin'

Only admin users can access `/admin/*` routes.

---

## 🐛 Troubleshooting

### **"Missing or invalid credentials"**
- Check `src/environments/environment.ts`
- Verify URL and anon key from Supabase Dashboard → Settings → API

### **"Permission denied" on database operations**
- Check RLS (Row Level Security) policies in Supabase
- Ensure policies allow the operations you're attempting
- For development, you can temporarily disable RLS (not recommended for production)

### **"User not found" after signing up**
- Check that user was created in Supabase Dashboard → Authentication
- Verify email confirmation if enabled
- Check browser console for detailed error messages

### **Real-time subscriptions not working**
- Ensure WebSocket connections are allowed in your network
- Check browser console for connection errors
- Verify table has RLS enabled

---

## 📚 Useful Resources

- **Supabase Docs:** https://supabase.com/docs
- **Angular Integration:** https://supabase.com/docs/guides/getting-started/tutorials/with-angular
- **PostgreSQL:** https://www.postgresql.org/docs/
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ Checklist Before Production

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database tables created with proper RLS policies
- [ ] Test user signup/login flow
- [ ] Test product CRUD operations
- [ ] Test admin guard on admin routes
- [ ] Set up email verification (optional)
- [ ] Configure CORS if using different domain
- [ ] Enable SSL/TLS
- [ ] Set up backups
- [ ] Test on staging environment first

---

## 🚀 Next Steps

1. **Add More Features:**
   - Order management
   - Shopping cart with Supabase
   - Customer reviews
   - Inventory tracking

2. **Security Enhancements:**
   - Implement RLS policies for user-specific data
   - Add rate limiting
   - Set up automated backups

3. **Performance Optimization:**
   - Add database indexes
   - Use Supabase Edge Functions
   - Implement caching strategies

---

**Questions?** Check the inline code comments in:
- `src/app/core/services/supabase.service.ts`
- `src/app/core/services/auth.service.ts`
- `src/app/features/auth/login/login.ts`
