# Plan Prisma + MySQL ERP Rubik

## Estado actual

- La API queda como fuente principal de datos para web y móvil.
- El modo productivo temporal sigue siendo `RUBIK_DATA_ADAPTER=json`.
- `server/data/rubik-db.json` en el proyecto API actúa como respaldo persistente mientras se estabiliza la sincronización.
- Prisma/MySQL no debe activarse hasta validar endpoints, permisos y migración de datos.

## Tablas necesarias

- `users`: usuarios, roles, permisos, estado, área y cargo.
- `clients`: clientes/contactos, empresa, RUT, teléfono, email, comuna, dirección y estado.
- `quotes`: cotizaciones, vendedor, cliente, montos, estado y metadata.
- `quote_items`: ítems de cotización asociados por `quote_id`.
- `documents`: documentos comerciales, tipo, número, estado, montos, tags y archivos futuros.
- `tenders`: licitaciones analizadas, riesgo, fechas, requerimientos y texto fuente.
- `work_orders`: órdenes internas, áreas, solicitante, asignado, prioridad, estado y fechas.
- `work_order_comments`: comentarios de órdenes.
- `work_order_movements`: movimientos o cambios de estado de órdenes.
- `financial_movements`: ingresos/egresos, cuentas por cobrar/pagar, saldos y estado.
- `payments`: pagos parciales/totales asociados a movimientos financieros.
- `suppliers`: proveedores y datos de pago.
- `materials`: materiales, costos, merma, margen y proveedor sugerido.
- `products`: productos/servicios, precios, material asociado y estado.
- `audit_logs`: auditoría transversal de creación, edición, pagos y cambios críticos.

## Endpoints listos para consumir API

- `GET /api/dashboard/summary`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/activity`
- `GET /api/clients` y `GET /api/clients/stats`
- `GET /api/quotes` y `GET /api/quotes/stats`
- `GET /api/documents` y `GET /api/documents/stats`
- `GET /api/tenders` y `GET /api/tenders/stats`
- `GET /api/work-orders` y `GET /api/work-orders/stats`
- `GET /api/finance/summary`, `GET /api/finance/stats` y `GET /api/finance/movements`
- `GET /api/users` y `GET /api/users/stats`
- `GET /api/suppliers` y `GET /api/suppliers/stats`
- `GET /api/materials` y `GET /api/materials/stats`
- `GET /api/products` y `GET /api/products/stats`

## Métodos que debe cubrir el adapter Prisma

- `list`, `create`, `update`, `remove`, `findById` para cada colección.
- `login` y `getUserByToken`.
- `createReceivableFromQuote`.
- `getFinanceSummary`.
- `registerPayment`.
- Métodos estadísticos o soporte suficiente para que `statisticsService` calcule desde `list`.

## Migración segura desde JSON

1. Respaldar `server/data/rubik-db.json`.
2. Ejecutar generación Prisma contra el schema final.
3. Crear tablas MySQL sin borrar datos existentes.
4. Importar JSON con upsert por claves de negocio:
   - usuario por email,
   - cliente/proveedor por RUT,
   - cotización por número,
   - documento por tipo + número,
   - licitación por `tenderId`.
5. Validar conteos con `GET /api/dev/status` y endpoints `/stats`.
6. Cambiar en ambiente de prueba `RUBIK_DATA_ADAPTER=prisma`.
7. Probar login, dashboard, cotizaciones, documentos, licitaciones, órdenes y finanzas.
8. Recién después cambiar producción desde `json` a `prisma`.

## Pendiente antes del cambio

- Alinear nombres de estados históricos con los estados unificados.
- Revisar campos obligatorios reales por módulo.
- Definir índices únicos finales.
- Validar permisos financieros con usuarios dueños/admin.
- Crear rollback simple: volver a `RUBIK_DATA_ADAPTER=json` si MySQL falla.
