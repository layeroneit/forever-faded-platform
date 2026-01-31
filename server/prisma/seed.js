import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const loc1 = await prisma.location.upsert({
    where: { id: 'loc-main' },
    update: {},
    create: {
      id: 'loc-main',
      name: 'Main Street',
      address: '123 Main St',
      city: 'Your City',
      state: 'ST',
      zip: '12345',
      phone: '(555) 123-4567',
      timezone: 'America/New_York',
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

  const services = [
    { name: 'Classic Cut', durationMinutes: 30, priceCents: 3500 },
    { name: 'Fade & Lineup', durationMinutes: 45, priceCents: 4500 },
    { name: 'Beard Trim', durationMinutes: 20, priceCents: 2500 },
    { name: 'Hot Towel Shave', durationMinutes: 30, priceCents: 4000 },
    { name: 'Full Service', durationMinutes: 60, priceCents: 6500 },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { id: `svc-${s.name.toLowerCase().replace(/\s/g, '-')}` },
      update: {},
      create: {
        id: `svc-${s.name.toLowerCase().replace(/\s/g, '-')}`,
        locationId: loc1.id,
        name: s.name,
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

  console.log('Seed complete:', { owner: owner.email, barbers: [barber1.email, barber2.email], client: client.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
