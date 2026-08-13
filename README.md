# Cabinet Séné

Aplicación web ligera para registrar la actividad diaria de un gabinete: consultas por médico, total generado, retiradas y aclaraciones.

## Funciones

- Tabla mensual por días.
- Médicos dinámicos: añadir, renombrar y quitar de la vista.
- Totales diarios y mensuales automáticos.
- Registro manual de total generado y dinero retirado/cogido.
- Campo de aclaraciones por día.
- Persistencia automática en `localStorage`.
- Exportación e importación de copias JSON.
- Diseño responsive para móvil y escritorio.
- Sin backend ni instalación.

## Datos

Los datos se guardan únicamente en el navegador del dispositivo. Borrar los datos del navegador puede eliminarlos, por eso se recomienda exportar una copia periódicamente.

## Publicación

El repositorio incluye un workflow de GitHub Pages en `.github/workflows/pages.yml`.
