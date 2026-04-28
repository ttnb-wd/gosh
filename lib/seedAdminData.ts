// Utility to seed sample data for admin dashboard testing
// Run this in browser console: seedAdminData()

export function seedAdminData() {
  // Sample orders
  const sampleOrders = [
    {
      id: "GOSH-1735123456789",
      customerName: "Aung Aung",
      phone: "09123456789",
      address: "123 Shwe Dagon Pagoda Road",
      city: "Yangon",
      paymentMethod: "KBZPay",
      paymentScreenshotName: "kbzpay_screenshot.jpg",
      items: [
        {
          id: 1,
          name: "Golden Noir",
          brand: "Dior",
          price: 20,
          qty: 1,
          selectedSize: "10ml"
        },
        {
          id: 2,
          name: "Velvet Oud",
          brand: "Chanel",
          price: 25,
          qty: 2,
          selectedSize: "10ml"
        }
      ],
      total: 70,
      status: "Pending",
      createdAt: new Date().toISOString()
    },
    {
      id: "GOSH-1735123456790",
      customerName: "Su Su",
      phone: "09987654321",
      address: "456 Inya Lake Road",
      city: "Yangon",
      paymentMethod: "Cash on Delivery",
      items: [
        {
          id: 3,
          name: "Midnight Amber",
          brand: "Gucci",
          price: 96,
          qty: 1
        }
      ],
      total: 96,
      status: "Confirmed",
      createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: "GOSH-1735123456791",
      customerName: "Kyaw Kyaw",
      phone: "09111222333",
      address: "789 Bogyoke Aung San Road",
      city: "Mandalay",
      paymentMethod: "WavePay",
      paymentScreenshotName: "wavepay_screenshot.jpg",
      items: [
        {
          id: 4,
          name: "Sunlit Bloom",
          brand: "YSL",
          price: 18,
          qty: 1,
          selectedSize: "10ml"
        }
      ],
      total: 18,
      status: "Delivered",
      createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];

  // Sample products (already in ProductSection, but adding to localStorage)
  const sampleProducts = [
    {
      id: 1,
      name: "Golden Noir",
      brand: "Dior",
      price: 89,
      desc: "Warm amber, vanilla, dark wood",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      stock: 45,
      category: "Woody",
      decants: [
        { label: "5ml", price: 12 },
        { label: "10ml", price: 20 },
        { label: "20ml", price: 35 },
        { label: "30ml", price: 48 }
      ]
    },
    {
      id: 2,
      name: "Velvet Oud",
      brand: "Chanel",
      price: 110,
      desc: "Deep oud, soft floral sweetness",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      stock: 32,
      category: "Oriental",
      decants: [
        { label: "5ml", price: 15 },
        { label: "10ml", price: 25 },
        { label: "20ml", price: 42 },
        { label: "30ml", price: 58 }
      ]
    },
    {
      id: 3,
      name: "Midnight Amber",
      brand: "Gucci",
      price: 96,
      desc: "Elegant spicy amber evening",
      image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      stock: 28,
      category: "Oriental",
      decants: [
        { label: "5ml", price: 13 },
        { label: "10ml", price: 22 },
        { label: "20ml", price: 38 },
        { label: "30ml", price: 52 }
      ]
    }
  ];

  try {
    localStorage.setItem("gosh_orders", JSON.stringify(sampleOrders));
    localStorage.setItem("gosh_products", JSON.stringify(sampleProducts));
    console.log("✅ Admin data seeded successfully!");
    console.log("📦 Orders:", sampleOrders.length);
    console.log("🛍️ Products:", sampleProducts.length);
    return true;
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    return false;
  }
}

// Make it available globally for browser console
if (typeof window !== "undefined") {
  (window as any).seedAdminData = seedAdminData;
}
