import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Forever Faded MKE services from https://foreverfadedmke.com/
const FOREVER_FADED_SERVICES = [
  // Face
  { category: 'Face', name: 'Beard & Head Lining', durationMinutes: 30, priceCents: 3500 },
  { category: 'Face', name: 'Beard Shave', durationMinutes: 30, priceCents: 2500 },
  { category: 'Face', name: 'Beard Lining', durationMinutes: 15, priceCents: 1500 },
  { category: 'Face', name: 'Head Lining', durationMinutes: 20, priceCents: 2000 },
  { category: 'Face', name: 'Full Facial', durationMinutes: 45, priceCents: 5500 },
  { category: 'Face', name: 'Full Facial and Hot Shave', durationMinutes: 60, priceCents: 7500 },
  // Adults
  { category: 'Adults', name: 'Cut', durationMinutes: 30, priceCents: 3500 },
  { category: 'Adults', name: 'Full Service', durationMinutes: 60, priceCents: 6500 },
  { category: 'Adults', name: 'Cut and Color', description: 'Simple bleach lightened process', durationMinutes: 90, priceCents: 9500 },
  { category: 'Adults', name: 'Custom Hair Design and Cut', durationMinutes: 45, priceCents: 5000 },
  { category: 'Adults', name: 'Female Undercut Design', durationMinutes: 45, priceCents: 5000 },
  { category: 'Adults', name: 'Hair Braiding', durationMinutes: 90, priceCents: 8500 },
  { category: 'Adults', name: 'Lining Taper', durationMinutes: 30, priceCents: 3500 },
  // Teens
  { category: 'Teens', name: 'Cut', durationMinutes: 30, priceCents: 3000 },
  { category: 'Teens', name: 'Full Service', durationMinutes: 60, priceCents: 5500 },
  // Children
  { category: 'Children', name: 'Cut', durationMinutes: 25, priceCents: 2500 },
  // Seniors & Military
  { category: 'Seniors & Military', name: 'Cut', durationMinutes: 30, priceCents: 3000 },
  { category: 'Seniors & Military', name: 'Full Service', durationMinutes: 60, priceCents: 5500 },
];

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const loc1 = await prisma.location.upsert({
    where: { id: 'loc-main' },
    update: {},
    create: {
      id: 'loc-main',
      name: 'Forever Faded — Waukesha',
      address: '1427 E Racine Ave Suite H',
      city: 'Waukesha',
      state: 'WI',
      zip: '53186',
      phone: '(262) 349-9289',
      timezone: 'America/Chicago',
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@foreverfaded.com' },
    update: {},
    create: {
      email: 'owner@foreverfaded.com',
      passwordHash,
      name: 'Sarah Williams',
      role: 'owner',
      locationId: loc1.id,
    },
  });

  const barber1 = await prisma.user.upsert({
    where: { email: 'mike@foreverfaded.com' },
    update: {},
    create: {
      email: 'mike@foreverfaded.com',
      passwordHash,
      name: 'Mike Johnson',
      role: 'barber',
      locationId: loc1.id,
    },
  });

  const barber2 = await prisma.user.upsert({
    where: { email: 'chris@foreverfaded.com' },
    update: {},
    create: {
      email: 'chris@foreverfaded.com',
      passwordHash,
      name: 'Chris Davis',
      role: 'barber',
      locationId: loc1.id,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      passwordHash,
      name: 'John Doe',
      role: 'client',
      preferredBarberId: barber1.id,
    },
  });

  // Services are global (locationId: null) so they appear at all locations (Waukesha, Part 2, etc.)
  for (const s of FOREVER_FADED_SERVICES) {
    const cat = s.category.toLowerCase().replace(/\s/g, '-').replace(/&/g, 'and');
    const slug = s.name.toLowerCase().replace(/\s/g, '-').replace(/&/g, 'and');
    const id = `svc-${cat}-${slug}`.slice(0, 50);
    await prisma.service.upsert({
      where: { id },
      update: {
        locationId: null,
        category: s.category,
        description: s.description || null,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
      },
      create: {
        id,
        locationId: null,
        name: s.name,
        category: s.category,
        description: s.description || null,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
      },
    });
  }

  await prisma.inventoryItem.upsert({
    where: { id: 'inv-1' },
    update: {},
    create: {
      id: 'inv-1',
      locationId: loc1.id,
      name: 'Clipper Oil',
      quantity: 24,
      reorderPoint: 10,
    },
  });

  console.log('Seed complete:', { owner: owner.email, barbers: [barber1.email, barber2.email], client: client.email, services: FOREVER_FADED_SERVICES.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
