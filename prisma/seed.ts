import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

/** Demo password for every seeded account. Change it after the first sign-in. */
const DEMO_PASSWORD = "Password123";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function hoursFromNow(hours: number) {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + hours);
  return date;
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const people = [
    { name: "Alice Perera", email: "alice@primewave.lk", department: "Operations", role: "ADMIN" },
    { name: "Bob Fernando", email: "bob@primewave.lk", department: "Engineering", role: "MEMBER" },
    { name: "Chamari Silva", email: "chamari@primewave.lk", department: "Sales", role: "MEMBER" },
  ] as const;
  const [alice, bob] = await Promise.all(
    people.map((person) =>
      prisma.user.upsert({
        where: { email: person.email },
        update: { passwordHash },
        create: { ...person, passwordHash },
      }),
    ),
  );

  const resources = [
    { name: "Board Room A", type: "MEETING_ROOM", location: "Level 3", capacity: 12, description: "Video conferencing, 75\" display" },
    { name: "Huddle Room 2", type: "MEETING_ROOM", location: "Level 2", capacity: 4, description: "Small room for quick syncs" },
    { name: "Epson Projector", type: "EQUIPMENT", location: "IT Store", description: "Portable 1080p projector with HDMI" },
    { name: "Toyota Hiace (CAR-4521)", type: "VEHICLE", location: "Basement Parking", capacity: 14, description: "Company van for site visits" },
    { name: "Hot Desk 07", type: "WORKSPACE", location: "Level 1", capacity: 1, status: "MAINTENANCE", description: "Monitor replacement pending" },
  ] as const;

  const created = await Promise.all(
    resources.map((r) => prisma.resource.upsert({ where: { name: r.name }, update: {}, create: r })),
  );

  if ((await prisma.reservation.count()) === 0) {
    await prisma.reservation.createMany({
      data: [
        { title: "Quarterly planning", resourceId: created[0].id, userId: alice.id, startTime: hoursFromNow(2), endTime: hoursFromNow(4) },
        { title: "Client site visit", resourceId: created[3].id, userId: bob.id, startTime: hoursFromNow(24), endTime: hoursFromNow(30) },
        { title: "Sprint review", resourceId: created[2].id, userId: bob.id, startTime: hoursFromNow(-48), endTime: hoursFromNow(-46), status: "COMPLETED" },
      ],
    });
  }

  console.log(`Seeded ${created.length} resources and ${people.length} users (password: ${DEMO_PASSWORD}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
