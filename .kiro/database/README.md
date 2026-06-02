# GOSH PERFUME - Database Documentation

## Overview
Supabase PostgreSQL database for GOSH PERFUME e-commerce platform.

## Tables Summary

### User Management
- **profiles** - User profile information with role-based access (customer/admin)

### Product Management
- **brands** - Perfume brand catalog
- **products** - Product inventory with pricing, stock, decants, and scent notes

### Order Management
- **orders** - Customer orders with payment and delivery info
- **order_items** - Individual line items for each order

### Site Configuration
- **site_settings** - Global store settings (singleton table, id=1)
- **website_settings** - Website content and contact information

### Communication
- **contact_messages** - Customer inquiries from contact form
- **newsletter_subscribers** - Email newsletter VIP club subscribers
- **testimonials** - Customer reviews and ratings

### Admin & Audit
- **admin_notifications** - Order-related notifications for admin dashboard
- **admin_audit_logs** - Audit trail for admin actions

## Key Features

### Product System
- **Decants**: JSONB array storing size variants with labels and prices
- **Notes**: JSONB object storing fragrance notes (top, heart, base, story, madeWith, bestFor)
- **Scent Collections**: Enum for Fresh, Woody, Floral, Oriental, Citrus, Aquatic, Sweet, Oud, Musk, Amber, Spicy
- **Badge**: Optional promotional badge text

### Order Workflow
- **Status**: Pending → Confirmed → Processing → Delivered (or Cancelled)
- **Payment Status**: Unpaid → Verifying → Paid (or Failed/Refunded)
- **Stock Management**: `stock_restored` flag for cancelled order inventory restoration

### Payment Methods Supported
- Cash on Delivery (COD)
- KBZPay
- WavePay
- AYAPay
- Bank Transfer

### Settings
- Two-level settings system:
  - `site_settings`: Store configuration, payment methods, delivery settings
  - `website_settings`: Website content, contact info, social media links

## Important Constraints

### Order Statuses
```
orders.status: 'Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'
orders.payment_status: 'Unpaid', 'Paid', 'Verifying', 'Failed', 'Refunded'
```

### User Roles
```
profiles.role: 'customer', 'admin'
```

### Contact Message Status
```
contact_messages.status: 'unread', 'read', 'archived'
```

### Newsletter Status
```
newsletter_subscribers.status: 'subscribed', 'unsubscribed'
```

## Relationships

```
auth.users (Supabase Auth)
  ↓
profiles (1:1)
  ↓
orders (1:many) → order_items (1:many)

brands (1:many) → products

orders (1:many) → admin_notifications
orders (1:many) → admin_audit_logs
```

## JSONB Fields

### products.decants
```json
[
  { "label": "5ml", "price": 15000 },
  { "label": "10ml", "price": 25000 }
]
```

### products.notes
```json
{
  "story": "Crafted by master perfumers...",
  "top": ["Bergamot", "Citrus"],
  "heart": ["Jasmine", "Rose"],
  "base": ["Sandalwood", "Vanilla"],
  "madeWith": "Premium natural ingredients...",
  "bestFor": "Evening wear, special occasions..."
}
```

## Usage Notes

- `site_settings` is a singleton table (only id=1 row exists)
- Product stock is tracked and auto-decremented on order
- Order numbers are unique and auto-generated
- All timestamps use `timestamp with time zone`
- Soft delete pattern: use `is_active` flags instead of DELETE
