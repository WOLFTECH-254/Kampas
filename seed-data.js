import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const B = path.join(__dirname, 'backend');

const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: B });

console.log('\n=============================================');
console.log('  🌱 Kampas — Seeding Database');
console.log('=============================================\n');

// Write seed file
fs.writeFileSync(path.join(B, 'prisma/seed.ts'), `
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Categories ────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'sneakers-drip' },    update: {}, create: { name: 'Sneakers & Drip',  slug: 'sneakers-drip',    icon: '👟' } }),
    prisma.category.upsert({ where: { slug: 'tech-gadgets' },     update: {}, create: { name: 'Tech & Gadgets',  slug: 'tech-gadgets',      icon: '💻' } }),
    prisma.category.upsert({ where: { slug: 'textbooks' },        update: {}, create: { name: 'Textbooks',        slug: 'textbooks',          icon: '📚' } }),
    prisma.category.upsert({ where: { slug: 'furniture' },        update: {}, create: { name: 'Furniture',        slug: 'furniture',          icon: '🛋️' } }),
    prisma.category.upsert({ where: { slug: 'food-drinks' },      update: {}, create: { name: 'Food & Drinks',   slug: 'food-drinks',        icon: '🍔' } }),
    prisma.category.upsert({ where: { slug: 'services' },         update: {}, create: { name: 'Services',         slug: 'services',           icon: '🛠️' } }),
    prisma.category.upsert({ where: { slug: 'electronics' },      update: {}, create: { name: 'Electronics',     slug: 'electronics',        icon: '📱' } }),
    prisma.category.upsert({ where: { slug: 'fashion' },          update: {}, create: { name: 'Fashion',          slug: 'fashion',            icon: '👗' } }),
  ]);
  console.log('  ✅ Categories seeded');

  // ── 2. Seller accounts ───────────────────────────────────────────────────
  const password = await bcrypt.hash('Kampas@Dev2026', 12);

  const sellers = await Promise.all([
    prisma.user.upsert({ where: { email: 'drip.kings@uon.ac.ke' },       update: {}, create: { name: 'Drip Kings UoN',      email: 'drip.kings@uon.ac.ke',       phone: '0711000001', campus: 'UoN Main Campus',  role: 'SELLER', password, isVerified: true, walletBalance: 5000 } }),
    prisma.user.upsert({ where: { email: 'techspot@strathmore.edu' },    update: {}, create: { name: 'TechSpot Strathmore', email: 'techspot@strathmore.edu',     phone: '0711000002', campus: 'Strathmore',        role: 'SELLER', password, isVerified: true, walletBalance: 8000 } }),
    prisma.user.upsert({ where: { email: 'campus.reads@jkuat.ac.ke' },   update: {}, create: { name: 'Campus Reads JKUAT',  email: 'campus.reads@jkuat.ac.ke',   phone: '0711000003', campus: 'JKUAT Main',        role: 'SELLER', password, isVerified: true, walletBalance: 3000 } }),
    prisma.user.upsert({ where: { email: 'gadgethub@ku.ac.ke' },         update: {}, create: { name: 'GadgetHub KU',        email: 'gadgethub@ku.ac.ke',          phone: '0711000004', campus: 'KU Main Campus',    role: 'SELLER', password, isVerified: true, walletBalance: 6000 } }),
    prisma.user.upsert({ where: { email: 'freshhits@tukenya.ac.ke' },    update: {}, create: { name: 'Fresh Hits TU Kenya', email: 'freshhits@tukenya.ac.ke',    phone: '0711000005', campus: 'TU Kenya',          role: 'SELLER', password, isVerified: true, walletBalance: 4000 } }),
    prisma.user.upsert({ where: { email: 'furniture.ke@mku.ac.ke' },     update: {}, create: { name: 'Furniture KE MKU',   email: 'furniture.ke@mku.ac.ke',      phone: '0711000006', campus: 'Mount Kenya Uni',   role: 'SELLER', password, isVerified: true, walletBalance: 2000 } }),
  ]);
  console.log('  ✅ Seller accounts seeded');

  // ── 3. Products ──────────────────────────────────────────────────────────
  const productData = [
    // Sneakers & Drip
    { title: 'Air Jordan 4 Retro',         price: 4500,  campus: 'UoN Main Campus',  condition: 'NEW',           categorySlug: 'sneakers-drip', sellerIdx: 0, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80'], stock: 3,  views: 245, description: 'Brand new Air Jordan 4 Retro. Size 42. Still in box. Perfect condition.' },
    { title: 'Nike Air Force 1 Low',        price: 3200,  campus: 'UoN Main Campus',  condition: 'SLIGHTLY_USED', categorySlug: 'sneakers-drip', sellerIdx: 0, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'], stock: 1,  views: 189, description: 'Slightly used Nike AF1. Worn twice. Size 41. Very clean.' },
    { title: 'Vintage Denim Jacket',        price: 1200,  campus: 'JKUAT Main',       condition: 'USED',          categorySlug: 'fashion',       sellerIdx: 2, images: ['https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&q=80'], stock: 1,  views: 98,  description: 'Classic vintage denim jacket. Size M. Great condition.' },
    { title: 'Adidas Hoodie (Black)',       price: 1800,  campus: 'TU Kenya',         condition: 'NEW',           categorySlug: 'sneakers-drip', sellerIdx: 4, images: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80'], stock: 5,  views: 134, description: 'Brand new Adidas hoodie. Black. Size L. Never worn.' },
    { title: 'Jordan 1 Mid Chicago',       price: 6500,  campus: 'Strathmore',       condition: 'NEW',           categorySlug: 'sneakers-drip', sellerIdx: 1, images: ['https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&q=80'], stock: 2,  views: 312, description: 'Authentic Jordan 1 Mid Chicago colorway. Size 43. With original box.' },

    // Tech & Gadgets
    { title: 'MacBook Pro M1 (Used)',       price: 95000, campus: 'Strathmore',       condition: 'SLIGHTLY_USED', categorySlug: 'tech-gadgets',  sellerIdx: 1, images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80'], stock: 1,  views: 421, description: 'MacBook Pro M1 2021. 8GB RAM, 256GB SSD. Excellent condition. Charger included.' },
    { title: 'PS5 Controller',             price: 6000,  campus: 'KU Main Campus',   condition: 'NEW',           categorySlug: 'electronics',   sellerIdx: 3, images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80'], stock: 4,  views: 203, description: 'Brand new DualSense PS5 controller. White. Sealed in box.' },
    { title: 'Samsung Galaxy A54',         price: 32000, campus: 'JKUAT Main',       condition: 'SLIGHTLY_USED', categorySlug: 'electronics',   sellerIdx: 2, images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80'], stock: 1,  views: 178, description: 'Samsung Galaxy A54 5G. 128GB. Used 3 months. No scratches. Box included.' },
    { title: 'JBL Flip 6 Speaker',         price: 8500,  campus: 'TU Kenya',         condition: 'NEW',           categorySlug: 'tech-gadgets',  sellerIdx: 4, images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80'], stock: 2,  views: 156, description: 'JBL Flip 6 portable speaker. Blue. Waterproof. New in box.' },
    { title: 'HP Laptop i5 (2022)',        price: 45000, campus: 'UoN Main Campus',  condition: 'SLIGHTLY_USED', categorySlug: 'tech-gadgets',  sellerIdx: 0, images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80'], stock: 1,  views: 267, description: 'HP EliteBook i5. 8GB RAM, 512GB SSD. Windows 11. Charger included.' },
    { title: 'AirPods Pro (2nd Gen)',      price: 14000, campus: 'Strathmore',       condition: 'NEW',           categorySlug: 'tech-gadgets',  sellerIdx: 1, images: ['https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=400&q=80'], stock: 3,  views: 389, description: 'Apple AirPods Pro 2nd generation. Sealed. With receipt.' },

    // Textbooks
    { title: 'Engineering Mathematics Yr1', price: 800,  campus: 'JKUAT Main',       condition: 'USED',          categorySlug: 'textbooks',     sellerIdx: 2, images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80'], stock: 2,  views: 87,  description: 'Engineering Mathematics by Stroud. 7th edition. Good condition. No missing pages.' },
    { title: 'Calculus by James Stewart', price: 1200,  campus: 'KU Main Campus',   condition: 'SLIGHTLY_USED', categorySlug: 'textbooks',     sellerIdx: 3, images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80'], stock: 1,  views: 65,  description: 'Calculus Early Transcendentals 8th Ed. Very clean. No highlights.' },
    { title: 'Introduction to Algorithms', price: 1500, campus: 'Strathmore',       condition: 'USED',          categorySlug: 'textbooks',     sellerIdx: 1, images: ['https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&q=80'], stock: 1,  views: 112, description: 'CLRS Algorithms book. Some highlighting on first 3 chapters only.' },
    { title: 'Business Law Textbook',      price: 600,  campus: 'TU Kenya',         condition: 'USED',          categorySlug: 'textbooks',     sellerIdx: 4, images: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80'], stock: 3,  views: 54,  description: 'Business Law for Commerce students. 5th edition. Clean copy.' },

    // Furniture
    { title: 'Study Desk + Chair (Set)',   price: 3500,  campus: 'Mount Kenya Uni',  condition: 'USED',          categorySlug: 'furniture',     sellerIdx: 5, images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=80'], stock: 1,  views: 76,  description: 'Wooden study desk + ergonomic chair. Good condition. Buyer arranges pickup.' },
    { title: 'Mini Fridge (50L)',          price: 4200,  campus: 'UoN Main Campus',  condition: 'SLIGHTLY_USED', categorySlug: 'furniture',     sellerIdx: 0, images: ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&q=80'], stock: 1,  views: 143, description: 'Working mini fridge. 50L. Perfect for hostel room. Buyer arranges pickup.' },
    { title: 'Reading Lamp (LED)',         price: 650,   campus: 'JKUAT Main',       condition: 'NEW',           categorySlug: 'furniture',     sellerIdx: 2, images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80'], stock: 8,  views: 45,  description: 'LED reading lamp with USB charging port. Eye-care mode. New.' },

    // Services
    { title: 'Graphic Design Services',   price: 500,   campus: 'TU Kenya',         condition: 'NEW',           categorySlug: 'services',      sellerIdx: 4, images: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80'], stock: 99, views: 234, description: 'Professional graphic design — logos, posters, social media graphics. Fast turnaround.' },
    { title: 'Laptop Repair & Servicing', price: 800,   campus: 'KU Main Campus',   condition: 'NEW',           categorySlug: 'services',      sellerIdx: 3, images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80'], stock: 99, views: 167, description: 'Laptop repair, OS installation, hardware fixes. Campus pickup/delivery available.' },
    { title: 'CV & Cover Letter Writing', price: 300,   campus: 'Strathmore',       condition: 'NEW',           categorySlug: 'services',      sellerIdx: 1, images: ['https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&q=80'], stock: 99, views: 89,  description: 'Professional CV writing for students and fresh graduates. ATS optimized.' },
  ];

  for (const p of productData) {
    const category = categories.find(c => c.slug === p.categorySlug)!;
    const seller   = sellers[p.sellerIdx];
    const existing = await prisma.product.findFirst({ where: { title: p.title, sellerId: seller.id } });
    if (!existing) {
      await prisma.product.create({
        data: {
          title: p.title, description: p.description, price: p.price,
          campus: p.campus, condition: p.condition, stock: p.stock, views: p.views,
          sellerId: seller.id, categoryId: category.id, isActive: true,
          images: { create: p.images.map((url, i) => ({ url, isPrimary: i === 0 })) },
        },
      });
    }
  }
  console.log('  ✅ Products seeded (20 products across 8 categories)');

  // ── 4. Events ─────────────────────────────────────────────────────────────
  const organizer = sellers[0];
  const eventsData = [
    { title: 'Nairobi Campus Music Fest',     campus: 'UoN Main Campus',  venue: 'UoN Graduation Square',       price: 200,  capacity: 500, startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  description: 'The biggest campus music festival in Nairobi. 10+ artists. Food & drinks available.', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80' },
    { title: 'Tech Startup Bootcamp',          campus: 'Strathmore',       venue: 'Strathmore @iLabAfrica',      price: 0,    capacity: 100, startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),  description: 'Free 2-day bootcamp for student entrepreneurs. Pitching session on day 2.', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80' },
    { title: 'JKUAT Sports Day 2026',          campus: 'JKUAT Main',       venue: 'JKUAT Sports Complex',        price: 50,   capacity: 800, startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), description: 'Annual JKUAT sports day. Football, athletics, swimming. Come support your faculty!', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80' },
    { title: 'Campus Fashion Show 2026',       campus: 'TU Kenya',         venue: 'TU Kenya Main Hall',          price: 150,  capacity: 300, startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), description: 'Annual student fashion show. Showcasing local designers and student models.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
    { title: 'KU Career Fair 2026',            campus: 'KU Main Campus',   venue: 'KU Indoor Stadium',           price: 0,    capacity: 600, startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),  description: 'Meet top employers. 50+ companies. Bring your CV. Free entry for students.', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&q=80' },
    { title: 'Comedy Night ft. Churchill',     campus: 'UoN Main Campus',  venue: 'UoN Taifa Hall',              price: 300,  capacity: 400, startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), description: 'A night of laughter with Churchill and friends. Doors open at 6PM.', image: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400&q=80' },
  ];

  for (const e of eventsData) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } });
    if (!existing) {
      await prisma.event.create({ data: { ...e, organizerId: organizer.id, isActive: true } });
    }
  }
  console.log('  ✅ Events seeded (6 events)');

  // ── 5. Housing ────────────────────────────────────────────────────────────
  const housingData = [
    { title: 'Modern Single Room - Unit 5',   campus: 'JKUAT Main',      price: 4500,  hostelName: 'Greenwood Hostels',  roomType: 'SINGLE',    amenities: JSON.stringify(['WiFi', 'Water 24/7', 'Security', 'Study Room']),   latitude: -1.1019, longitude: 37.0134, description: 'Clean modern single room 5 mins from JKUAT gate. WiFi included. Water 24/7.', images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80'] },
    { title: 'Bedsitter near UoN Gate A',     campus: 'UoN Main Campus', price: 7000,  hostelName: 'Varsity Heights',    roomType: 'BEDSITTER', amenities: JSON.stringify(['WiFi', 'Parking', 'CCTV', 'Water Borehole']),     latitude: -1.2792, longitude: 36.8186, description: 'Spacious bedsitter 2 mins from UoN Gate A. Fully furnished option available.', images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80'] },
    { title: 'Double Room - KU Campus',       campus: 'KU Main Campus',  price: 3500,  hostelName: 'Campus View Hostel', roomType: 'DOUBLE',    amenities: JSON.stringify(['Water Tank', 'Security Guard', 'Common Kitchen']), latitude: -1.1817, longitude: 36.9285, description: 'Affordable double room shared with one other student. Friendly environment.', images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80'] },
    { title: 'Studio Apt - Strathmore Area',  campus: 'Strathmore',      price: 15000, hostelName: 'Madaraka Estate',    roomType: 'BEDSITTER', amenities: JSON.stringify(['WiFi', 'Gym', 'Rooftop', 'Parking', 'Backup Power']), latitude: -1.3005, longitude: 36.8217, description: 'Modern studio apartment near Strathmore. Fully furnished. Backup power.', images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80'] },
    { title: 'Single Room - TU Kenya Gate',   campus: 'TU Kenya',        price: 3800,  hostelName: 'TU Annexe',          roomType: 'SINGLE',    amenities: JSON.stringify(['WiFi', 'Water', 'Security']),                     latitude: -1.0396, longitude: 37.0594, description: 'Clean single room walking distance from TU Kenya main gate. Quiet environment.', images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80'] },
    { title: 'Shared House - JKUAT (4 pax)',  campus: 'JKUAT Main',      price: 2500,  hostelName: 'Thika Road Homes',   roomType: 'SINGLE',    amenities: JSON.stringify(['Shared Kitchen', 'WiFi', 'Garden', 'Parking']),  latitude: -1.1044, longitude: 37.0098, description: 'Room in shared 4-bedroom house. Students only. Tight-knit community.' , images: ['https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80'] },
  ];

  for (const h of housingData) {
    const owner    = sellers[housingData.indexOf(h) % sellers.length];
    const existing = await prisma.housing.findFirst({ where: { title: h.title } });
    if (!existing) {
      const { images, ...rest } = h;
      await prisma.housing.create({ data: { ...rest, ownerId: owner.id, isAvailable: true, isVerified: true, images: { create: images.map(url => ({ url })) } } });
    }
  }
  console.log('  ✅ Housing seeded (6 listings)');

  console.log('\\n🎉 Database seeded successfully!');
  console.log('   20 products | 8 categories | 6 sellers');
  console.log('   6 events    | 6 housing listings');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.\$disconnect());
`);

// Add seed script to package.json
const pkgPath = path.join(B, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts['db:seed'] = 'tsx prisma/seed.ts';
pkg.prisma = { seed: 'tsx prisma/seed.ts' };
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('  📄 package.json (seed script added)');

console.log('\n🌱 Running seed...\n');
run('npx tsx prisma/seed.ts');

console.log('\n=============================================');
console.log('  ✅ Database seeded!');
console.log('');
console.log('  20 products across 8 categories');
console.log('  6 seller accounts');
console.log('  6 campus events');
console.log('  6 housing listings');
console.log('');
console.log('  Test: GET http://localhost:8000/api/products');
console.log('=============================================\n');