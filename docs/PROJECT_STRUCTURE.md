# Estructura del proyecto ERP Rubik

Este repositorio contiene la aplicacion web del ERP Rubik basada en React, Vite y CoreUI, junto con un backend interno de apoyo para desarrollo y despliegue controlado.

## Carpetas principales

- `src`: frontend React/CoreUI. Contiene vistas, componentes, contexto de autenticacion, servicios de API y utilidades compartidas del cliente.
- `server`: API/backend interno Node + Express. Contiene rutas, middleware, servicios, adaptadores de datos y utilidades del servidor.
- `prisma`: schema principal de base de datos para Prisma.
- `public/templates`: plantillas usadas por el ERP, incluyendo la plantilla Excel de cotizacion.
- `_archive`: respaldo de archivos movidos durante limpiezas. No es codigo activo de produccion.
- `tmp`: archivos temporales de pruebas o generacion local. No debe considerarse contenido productivo.
- `build`: salida generada por `npm run build`. No se edita manualmente.
- `node_modules`: dependencias instaladas. No se edita manualmente.

## Convencion de trabajo

- No eliminar archivos dudosos durante limpieza estructural; moverlos a `_archive` o documentarlos.
- Mantener el frontend en `src` y la API interna en `server`.
- Mantener plantillas reales en `public/templates`.
- Usar `docs/DUPLICATES_AUDIT.md` para registrar duplicados antes de consolidarlos.
