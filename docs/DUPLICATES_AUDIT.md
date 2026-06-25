# Auditoria de posibles duplicados

Fecha: 2026-06-25

Esta auditoria no elimina archivos. Solo registra posibles duplicados y cual parece activo segun imports y montaje actual.

## Prisma

- `prisma/schema.prisma`
- `server/prisma/schema.prisma`

Estado observado: ambos existen. El schema raiz `prisma/schema.prisma` es el lugar esperado por los comandos Prisma estandar (`prisma generate`, `prisma migrate`, `prisma studio`). `server/prisma/schema.prisma` parece una copia o estructura anterior para el backend interno. No se elimino ninguno.

## Rutas backend

- `server/routes/*Routes.js`
- `server/routes/*.js`

Estado observado: `server/apiServer.js` importa y monta los archivos `authRoutes.js`, `dashboardRoutes.js`, `clientRoutes.js`, `quoteRoutes.js`, `documentRoutes.js`, `tenderRoutes.js`, `workOrderRoutes.js`, `financeRoutes.js`, `supplierRoutes.js`, `userRoutes.js` y `devRoutes.js`.

Tambien existe `server/routes/index.js`, que monta routers cortos como `users.js`, `clients.js`, `quotes.js`, `documents.js`, `tenders.js`, `workOrders.js`, `finance.js`, `payments.js`, `suppliers.js` e `imports.js`. Segun el servidor actual, la ruta activa de produccion/desarrollo es la familia `*Routes.js`. La familia corta queda como posible estructura paralela o anterior.

## Login React

- `src/views/auth/Login.jsx`
- `src/views/pages/login/Login.jsx`

Estado observado: `src/App.jsx` importa el login activo desde `./views/auth/Login`. `src/routes.js` no define el login. `src/views/pages/login/Login.jsx` parece ser el login demo heredado de CoreUI y no el login activo del ERP.

## Exportacion Excel de listados

- `src/utils/exportListToExcel.js`
- `server/utils/exportListToExcel.js`

Estado observado: las vistas React importan `src/utils/exportListToExcel.js`. El archivo en `server/utils/exportListToExcel.js` parece una version de servidor o copia paralela. No se elimino ninguno.

## Calculos financieros

- `src/utils/financeCalculations.js`
- `server/utils/financeCalculations.js`

Estado observado: el frontend importa `src/utils/financeCalculations.js` en vistas y storage local. El backend importa `server/utils/financeCalculations.js` desde servicios como `server/services/dataAdapter.js` y `server/services/postgresDataAdapter.js`. Ambos tienen contextos activos distintos y no deben consolidarse sin revisar contratos cliente/servidor.

## Recomendacion

Antes de eliminar duplicados, decidir una arquitectura objetivo:

- Frontend: utilidades solo en `src/utils`.
- Backend: utilidades solo en `server/utils`.
- Prisma: mantener un unico schema oficial en `prisma/schema.prisma` salvo que exista razon documentada para `server/prisma`.
- Rutas backend: escoger entre `*Routes.js` o routers cortos y migrar endpoint por endpoint con pruebas.
