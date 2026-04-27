import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Read supplements database JSON
  const supplementsPath = path.join(__dirname, 'supplements_database.json');
  const supplementsData = JSON.parse(fs.readFileSync(supplementsPath, 'utf-8'));

  // Clear existing supplement database
  await prisma.supplement_database.deleteMany();
  console.log('Cleared existing supplement database');

  // Insert supplements
  for (const supplement of supplementsData.supplements) {
    await prisma.supplement_database.create({
      data: {
        id: supplement.id,
        name: supplement.name,
        category: supplement.category,
        forms: supplement.forms,
        typical_dosage: supplement.typical_dosage,
        functions: supplement.functions,
        benefits: supplement.benefits,
        notes: supplement.notes,
      },
    });
  }

  console.log(`Seeded ${supplementsData.supplements.length} supplements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
