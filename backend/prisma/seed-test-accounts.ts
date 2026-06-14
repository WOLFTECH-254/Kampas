import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample accounts...\n');

  const PASSWORD = 'Kampas@2024';
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ── ADMIN ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kampas.co.ke' },
    update: { password: hash, role: 'ADMIN', isVerified: true, isActive: true },
    create: {
      name:         'Kampas Support',
      email:        'admin@kampas.co.ke',
      password:     hash,
      role:         'ADMIN',
      campus:       'Nairobi, Kenya',
      phone:        '+254700000001',
      isVerified:   true,
      walletBalance: 0,
    },
  });
  console.log(`✅ ADMIN created: ${admin.email}`);

  // ── SELLER ───────────────────────────────────────────────
  const seller = await prisma.user.upsert({
    where: { email: 'seller@kampas.co.ke' },
    update: { password: hash, role: 'SELLER', isVerified: true, isActive: true },
    create: {
      name:         'Briton Odhiambo',
      email:        'seller@kampas.co.ke',
      password:     hash,
      role:         'SELLER',
      campus:       'Strathmore',
      phone:        '+254700000002',
      isVerified:   true,
      sellerBalance: 5000,
    },
  });
  console.log(`✅ SELLER created: ${seller.email}`);

  // Store for seller
  await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      sellerId:    seller.id,
      name:        "Briton's Campus Drip",
      description: 'Top campus fashion, gadgets and more. Fast delivery on Strathmore campus.',
      theme:       'pink',
      isOpen:      true,
    },
  });
  console.log('  📦 Store created for seller');

  // Category
  const cat = await prisma.category.upsert({
    where: { slug: 'tech-gadgets' },
    update: {},
    create: { name: 'Tech & Gadgets', slug: 'tech-gadgets', icon: '💻' },
  });

  // 3 products
  const productData = [
    {
      title:       'Apple AirPods Pro (2nd Gen)',
      description: 'Brand new sealed box, bought from Nairobi Apple store.',
      price:       18500,
      condition:   'NEW',
      stock:       5,
      images:      ['https://images.unsplash.com/photo-1606220838315-056192d5e927?w=400&q=80'],
    },
    {
      title:       'Samsung Galaxy A54 (Used)',
      description: 'Slightly used, 128GB storage, excellent condition. Original charger included.',
      price:       32000,
      condition:   'SLIGHTLY_USED',
      stock:       1,
      images:      ['https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&q=80'],
    },
    {
      title:       'Vintage Denim Jacket – S/M',
      description: 'Y2K style denim, thrifted from Gikomba. Perfect campus drip.',
      price:       1200,
      condition:   'THRIFTED',
      stock:       1,
      images:      ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&q=80'],
    },
  ];

  for (const pd of productData) {
    const product = await prisma.product.create({
      data: {
        sellerId:   seller.id,
        title:      pd.title,
        description: pd.description,
        price:      pd.price,
        campus:     'Strathmore',
        condition:  pd.condition,
        categoryId: cat.id,
        stock:      pd.stock,
        isActive:   true,
        isFeatured: true,
      },
    });
    // Add product image
    await prisma.productImage.create({
      data: { productId: product.id, url: pd.images[0], isPrimary: true },
    });
    console.log(`  🛍️  Product: ${pd.title}`);
  }

  // ── BUYER ────────────────────────────────────────────────
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@kampas.co.ke' },
    update: { password: hash, role: 'BUYER', isVerified: true, walletBalance: 2000 },
    create: {
      name:          'Amara Wanjiru',
      email:         'buyer@kampas.co.ke',
      password:      hash,
      role:          'BUYER',
      campus:        'UoN Main Campus',
      phone:         '+254700000003',
      isVerified:    true,
      walletBalance: 2000,
    },
  });
  console.log(`✅ BUYER created: ${buyer.email} (Wallet: KSH 2,000)`);

  // Wallet top-up transaction record
  await prisma.walletTransaction.create({
    data: {
      userId:      buyer.id,
      type:        'TOPUP',
      amount:      2000,
      balance:     2000,
      description: 'Initial wallet funding',
      status:      'COMPLETED',
    },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Test accounts ready!\n');
  console.log(`ADMIN:  admin@kampas.co.ke  /  ${PASSWORD}`);
  console.log(`SELLER: seller@kampas.co.ke /  ${PASSWORD}`);
  console.log(`BUYER:  buyer@kampas.co.ke  /  ${PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
