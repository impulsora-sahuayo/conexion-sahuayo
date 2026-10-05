# Conexión Sahuayo — revista digital

Prototipo estático del visualizador de la edición **Septiembre · Octubre 2026**.

## Qué incluye

- Portada de presentación.
- Lector adaptable: una página en móvil y doble página en escritorio.
- Navegación con botones, teclado y gesto de deslizamiento.
- Índice visual con miniaturas de las 34 páginas.
- Modo pantalla completa.
- Descarga del PDF original.
- Sin Google Analytics ni rastreo en esta versión.
- Sin dependencias externas: funciona únicamente con HTML, CSS y JavaScript.

## Estructura

```text
conexion-sahuayo/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── reader.js
├── pages/
│   └── page-01.jpg ... page-34.jpg
├── revista/
│   └── conexion-sahuayo-sep-oct-2026.pdf
├── .nojekyll
└── README.md
```

## Publicarlo con GitHub Pages

1. Sube **todo el contenido de esta carpeta** a la raíz del repositorio `conexion-sahuayo`.
2. En GitHub entra a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. En **Branch**, selecciona `main` y la carpeta `/ (root)`.
5. Pulsa **Save**.
6. Espera unos minutos. GitHub mostrará la URL pública del sitio.

Para una cuenta `Stratcom2026` y un repositorio `conexion-sahuayo`, la URL normalmente tendrá esta forma:

`https://stratcom2026.github.io/conexion-sahuayo/`

## Cambiar la revista en el futuro

Para una nueva edición se puede conservar el lector y sustituir/agregar el PDF y las imágenes de las páginas. Más adelante conviene convertir este prototipo en una hemeroteca para conservar varias ediciones.
