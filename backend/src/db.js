// Singleton de PrismaClient — evita múltiples conexiones por proceso
// (en serverless esto reduce conexiones y cold starts).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
