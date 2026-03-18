# Jhoana Rosales Boutique - Base MVC

Base inicial del e-commerce en Node.js + Express + EJS + Prisma + PostgreSQL.

## Alcance fase 3-4
- Bootstrap Express
- Configuracion base
- Estructura MVC
- Prisma client
- Auth base
- Rutas base
- Controllers/services/repositories por dominio
- Storefront, checkout y admin funcional base
- Middlewares de seguridad y validaciones

## Seguridad activa
- `helmet` con CSP base
- CSRF en rutas con sesion (excepto webhook de pago externo)
- Rate limiting en login cliente/admin
- Validacion Zod centralizada (`req.body`, `req.params`, `req.query` saneados)
- Verificacion de firma para webhook de pago (Wompi stub)

## Requisitos
- Node.js 20+
- PostgreSQL

## Variables de entorno
Revisa `.env.example`.

## Primeros pasos
1. Copia `.env.example` como `.env`.
2. Instala dependencias: `npm install`.
3. Genera Prisma Client: `npm run prisma:generate`.
4. Crea migraciones: `npm run prisma:migrate`.
5. Levanta en desarrollo: `npm run dev`.

## Estructura
- `src/config`: bootstrap y configuraciones
- `src/routes`: enrutamiento por dominio publico/cliente/admin
- `src/modules`: modulos MVC por dominio
- `src/middlewares`: auth, seguridad, validacion, errores
- `prisma`: schema y seed

# e-commerce
