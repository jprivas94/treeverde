import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('123456', 12);

  const jean = await prisma.user.upsert({
    where: { email: 'jean@test.com' },
    update: {},
    create: { name: 'Jean', email: 'jean@test.com', password }
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@test.com' },
    update: {},
    create: { name: 'Alice', email: 'alice@test.com', password }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@test.com' },
    update: {},
    create: { name: 'Bob', email: 'bob@test.com', password }
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@test.com' },
    update: {},
    create: { name: 'Carol', email: 'carol@test.com', password }
  });

  // Limpiar tareas existentes
  await prisma.task.deleteMany();

  const tasks = [
    // ── Jean ── Historial (completadas) ──────────
    {
      title: 'Migrar base de datos a MySQL',
      description: 'Cambio de SQLite a MySQL para producción',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(15),
      completedAt: daysAgo(17),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Implementar autenticación 2FA',
      description: 'Google Authenticator + backup codes',
      status: 'DONE',
      priority: 'CRITICAL',
      dueDate: daysAgo(12),
      completedAt: daysAgo(12),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Diseñar dashboard analítico',
      description: 'Gráficos y métricas en tiempo real',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: daysAgo(10),
      completedAt: daysAgo(13),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Refactorizar módulo de usuarios',
      description: 'Separar lógica de negocio de rutas',
      status: 'DONE',
      priority: 'LOW',
      dueDate: daysAgo(10),
      completedAt: daysAgo(2),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Diseñar interfaz de usuario',
      description: 'Mockups en Figma para la vista principal',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(8),
      completedAt: daysAgo(10),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Implementar sistema de notificaciones',
      description: 'Notificaciones push y email',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: daysAgo(6),
      completedAt: daysAgo(7),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Configurar CI/CD',
      description: 'Pipeline de pruebas y despliegue automático',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(5),
      completedAt: daysAgo(5),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Corregir bug crítico en login',
      description: 'Error 500 al enviar formulario vacío',
      status: 'DONE',
      priority: 'CRITICAL',
      dueDate: daysAgo(3),
      completedAt: daysAgo(2),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Desplegar versión beta',
      description: 'Release v0.2.0 en servidor de staging',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(2),
      completedAt: daysAgo(1),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Optimizar carga de imágenes',
      description: 'WebP y lazy loading',
      status: 'DONE',
      priority: 'LOW',
      dueDate: daysAgo(4),
      completedAt: daysAgo(6),
      assigneeId: jean.id,
      creatorId: jean.id
    },

    // ── Jean ── Por Terminar (pendientes) ────────
    {
      title: 'Implementar WebSockets en tiempo real',
      description: 'Notificaciones en vivo con Socket.io',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: daysAhead(2),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Pruebas de carga y estrés',
      description: '1000 usuarios concurrentes mínimo',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: daysAhead(5),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Documentar API REST',
      description: 'Swagger/OpenAPI docs completos',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(7),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Implementar caché con Redis',
      description: 'Cachear consultas frecuentes',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(10),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Auditoría de seguridad',
      description: 'Revisar vulnerabilidades OWASP',
      status: 'TODO',
      priority: 'CRITICAL',
      dueDate: daysAhead(4),
      assigneeId: jean.id,
      creatorId: jean.id
    },
    {
      title: 'Internacionalización (i18n)',
      description: 'Soporte para inglés y portugués',
      status: 'TODO',
      priority: 'LOW',
      dueDate: null,
      assigneeId: jean.id,
      creatorId: jean.id
    },

    // ── Jean ── Creadas por Bob ───────────────
    {
      title: 'Integrar pasarela de pago Stripe',
      description: 'Pagos con tarjeta, PayPal y suscripciones',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(14),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Exportar reportes en PDF',
      description: 'Reportes mensuales descargables con gráficos',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(20),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Chat en vivo con clientes',
      description: 'Widget de chat con soporte en tiempo real',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(30),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Dashboard de métricas avanzadas',
      description: 'KPIs, gráficos interactivos y exportación',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(21),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Optimizar SEO on-page',
      description: 'Meta tags, sitemap, robots.txt y Schema.org',
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysAhead(25),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Migrar a TypeScript',
      description: 'Convertir todo el código base a TypeScript',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(45),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Pruebas E2E con Cypress',
      description: 'Automatizar tests de integración y flujos críticos',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(14),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Implementar modo oscuro',
      description: 'Tema oscuro completo con persistencia en localStorage',
      status: 'TODO',
      priority: 'LOW',
      dueDate: daysAhead(60),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Sistema de roles y permisos',
      description: 'Roles Admin, Editor y Viewer con control de acceso',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(10),
      assigneeId: jean.id,
      creatorId: bob.id
    },
    {
      title: 'Webhooks para integraciones',
      description: 'Webhooks entrantes y salientes con firma HMAC',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: daysAhead(35),
      assigneeId: jean.id,
      creatorId: bob.id
    },

    // ── Alice ────────────────────────────────
    {
      title: 'Diseñar interfaz de login',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(2),
      assigneeId: alice.id,
      creatorId: alice.id
    },
    {
      title: 'Implementar autenticación JWT',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: daysAhead(1),
      assigneeId: alice.id,
      creatorId: alice.id
    },
    {
      title: 'Crear página de perfil',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: daysAgo(4),
      completedAt: daysAgo(3),
      assigneeId: alice.id,
      creatorId: alice.id
    },

    // ── Bob ──────────────────────────────────
    {
      title: 'Configurar base de datos',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: daysAgo(1),
      assigneeId: bob.id,
      creatorId: bob.id
    },
    {
      title: 'Escribir tests unitarios',
      description: 'Cobertura mínima del 80%',
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: daysAgo(3),
      completedAt: daysAgo(5),
      assigneeId: bob.id,
      creatorId: bob.id
    },
    {
      title: 'Implementar caché con Redis',
      status: 'DONE',
      priority: 'LOW',
      dueDate: daysAgo(6),
      completedAt: daysAgo(2),
      assigneeId: bob.id,
      creatorId: bob.id
    },

    // ── Carol ────────────────────────────────
    {
      title: 'Crear componentes del tablero',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysAhead(4),
      assigneeId: carol.id,
      creatorId: carol.id
    },
    {
      title: 'Desplegar en producción',
      description: 'VPS con Docker y Nginx',
      status: 'DONE',
      priority: 'CRITICAL',
      dueDate: daysAgo(2),
      completedAt: daysAgo(3),
      assigneeId: carol.id,
      creatorId: carol.id
    },
    {
      title: 'Migrar datos a PostgreSQL',
      status: 'DONE',
      priority: 'HIGH',
      dueDate: daysAgo(5),
      completedAt: daysAgo(4),
      assigneeId: carol.id,
      creatorId: carol.id
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({ data: t });
  }

  console.log('Seed completado!');
  console.log('Usuarios de prueba:');
  console.log('  jean@test.com / 123456 (Jean)');
  console.log('  alice@test.com / 123456 (Alice)');
  console.log('  bob@test.com / 123456 (Bob)');
  console.log('  carol@test.com / 123456 (Carol)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
