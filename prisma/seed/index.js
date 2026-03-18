const bcrypt = require('bcrypt');
const {
  PrismaClient,
  Role,
  PromotionStatus,
  PromotionTriggerType,
  DiscountType,
  CouponStatus
} = require('@prisma/client');

const prisma = new PrismaClient();

async function upsertUsers() {
  const adminPasswordHash = await bcrypt.hash('Admin123*', 10);
  const clientPasswordHash = await bcrypt.hash('Cliente123*', 10);

  await prisma.user.upsert({
    where: { email: 'admin@jhoanarosalesboutique.com' },
    update: {},
    create: {
      email: 'admin@jhoanarosalesboutique.com',
      passwordHash: adminPasswordHash,
      firstName: 'Jhoana',
      lastName: 'Rosales',
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: 'cliente.demo@jhoanarosalesboutique.com' },
    update: {},
    create: {
      email: 'cliente.demo@jhoanarosalesboutique.com',
      passwordHash: clientPasswordHash,
      firstName: 'Cliente',
      lastName: 'Demo',
      role: Role.CLIENT
    }
  });
}

async function upsertCatalog() {
  const categories = [
    { name: 'Vestidos', slug: 'vestidos' },
    { name: 'Blusas', slug: 'blusas' },
    { name: 'Faldas', slug: 'faldas' },
    { name: 'Pantalones', slug: 'pantalones' },
    { name: 'Conjuntos', slug: 'conjuntos' },
    { name: 'Accesorios', slug: 'accesorios' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    });
  }

  const sizes = [
    { code: 'XS', name: 'Extra Small', sortOrder: 1 },
    { code: 'S', name: 'Small', sortOrder: 2 },
    { code: 'M', name: 'Medium', sortOrder: 3 },
    { code: 'L', name: 'Large', sortOrder: 4 },
    { code: 'XL', name: 'Extra Large', sortOrder: 5 },
    { code: 'ONE_SIZE', name: 'Talla unica', sortOrder: 6 }
  ];

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { code: size.code },
      update: {},
      create: size
    });
  }
}

async function upsertPromotion() {
  const promo = await prisma.promotion.upsert({
    where: { id: 'promo-base-vestidos' },
    update: {},
    create: {
      id: 'promo-base-vestidos',
      name: '15% Vestidos',
      triggerType: PromotionTriggerType.AUTOMATIC,
      discountType: DiscountType.PERCENTAGE,
      value: 15,
      minSubtotal: 180000,
      status: PromotionStatus.ACTIVE,
      startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  await prisma.coupon.upsert({
    where: { code: 'BIENVENIDA10' },
    update: {},
    create: {
      promotionId: promo.id,
      code: 'BIENVENIDA10',
      status: CouponStatus.ACTIVE,
      usageLimit: 1000,
      perUserLimit: 1
    }
  });
}

async function main() {
  await upsertUsers();
  await upsertCatalog();
  await upsertPromotion();
  // Nota: productos/variantes/ledger se completan en fase posterior.
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
