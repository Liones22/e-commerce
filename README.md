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

## Primeros pasos local
1. Copia `.env.example` como `.env`.
2. Instala dependencias: `npm install`.
3. Genera Prisma Client: `npm run prisma:generate`.
4. Crea migraciones: `npm run prisma:migrate`.
5. Levanta en desarrollo: `npm run dev`.

## Deploy en Render (web)
Este repo incluye [render.yaml](/C:/Users/cbita/OneDrive/Escritorio/Proyectos personales/E-commerce/render.yaml) para desplegar app + Postgres con Blueprint.

1. Sube el repo a GitHub.
2. En Render: `New` -> `Blueprint`.
3. Selecciona el repo y confirma el archivo `render.yaml`.
4. Render creara:
   - servicio web `jrb-ecommerce-web`
   - base Postgres `jrb-ecommerce-db`
5. Espera el deploy inicial y abre la URL publica del servicio.

### Comandos de deploy configurados
- Build: `npm ci --include=dev && npm run prisma:generate`
- Start: `npm run prisma:deploy || npx prisma db push && npm start`

## Estructura
- `src/config`: bootstrap y configuraciones
- `src/routes`: enrutamiento por dominio publico/cliente/admin
- `src/modules`: modulos MVC por dominio
- `src/middlewares`: auth, seguridad, validacion, errores
- `prisma`: schema y seed
