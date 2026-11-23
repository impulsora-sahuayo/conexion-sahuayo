# Conexión Sahuayo — Noviembre · Diciembre 2026 + hemeroteca mínima

**Versión preparada para subir a un solo repositorio de GitHub Pages.** Noviembre–diciembre de 2026 es la edición principal; el enlace «Consultar números anteriores» lleva a una hemeroteca sencilla que contiene septiembre–octubre de 2026. **No incluye julio–agosto ni añade un sistema complejo de administración.**

## Estructura

```text
/ (raíz del repositorio)
├── index.html                         ← NOV–DIC, edición principal (35 páginas)
├── css/styles.css                     ← estilos del lector actual y botón hemeroteca
├── js/reader.js                       ← lector actual con giro 3D
├── pages/                              ← 35 páginas NOV–DIC
├── thumbs/                             ← 35 miniaturas NOV–DIC
├── revista/                            ← PDF NOV–DIC
├── social/                             ← tarjeta social NOV–DIC (1200 × 630)
├── ediciones/
│   ├── index.html                     ← hemeroteca básica (1 edición)
│   ├── hemeroteca.css
│   └── septiembre-octubre-2026/
│       ├── index.html                 ← lector ORIGINAL SEP–OCT (34 páginas)
│       ├── css/styles.css             ← estilos del lector original
│       ├── js/reader.js               ← motor original sin modificar
│       ├── pages/                      ← 34 páginas originales
│       ├── revista/                    ← PDF original SEP–OCT
│       └── social/                     ← tarjeta social exclusiva (1200 × 630)
└── .nojekyll
```

## Enlaces esperados después de publicar

- Revista vigente: https://impulsora-sahuayo.github.io/conexion-sahuayo/
- Hemeroteca: https://impulsora-sahuayo.github.io/conexion-sahuayo/ediciones/
- Septiembre–octubre: https://impulsora-sahuayo.github.io/conexion-sahuayo/ediciones/septiembre-octubre-2026/

Estas direcciones parten del dominio y repositorio configurados en el proyecto original. **Si cambian la cuenta, el nombre del repositorio o el dominio, hay que actualizar las URL absolutas de las etiquetas Open Graph y los enlaces canónicos** en los tres archivos HTML antes de publicar.

## Cómo subir a GitHub sin perder nada

1. Antes de subir, guarda una copia de seguridad del repositorio actual o crea un commit de respaldo; contiene la edición anterior.
2. Descarga y **descomprime** el ZIP de esta entrega.
3. Sube **el contenido de la carpeta descomprimida a la raíz del mismo repositorio**, NO la carpeta completa ni el ZIP como archivo; deben quedar `index.html` y `ediciones/` directamente en la raíz. Si se utiliza Git en lugar de la interfaz de GitHub, agrega y confirma los archivos nuevos y modificados y súbelos a `main`.
4. La publicación debe seguir configurada en **Settings → Pages → Deploy from a branch → main / (root)**, como en el proyecto actual.
5. No elimines la carpeta `ediciones/` ni las imágenes del número anterior. El PDF SEP–OCT también se conserva dentro de ella.
6. Comprueba los tres enlaces indicados, la lectura en escritorio y móvil, las descargas de ambos PDF y las tarjetas sociales.
7. Si el repositorio conserva archivos antiguos sin utilizar en la raíz (por ejemplo, `revista/conexion-sahuayo-sep-oct-2026.pdf`), pueden retirarse tras comprobar que la copia archivada funciona. La carga de archivos mediante interfaz web no elimina sobrantes de forma automática.

## Qué cambia y qué no

- Edición principal NOV–DIC: 35 páginas, lector con giro 3D, miniaturas, zoom, pantalla completa, descarga y analítica. Se añadió un solo acceso discreto a la hemeroteca.
- Hemeroteca: página ligera con una tarjeta para SEP–OCT y botones para leer o descargar.
- SEP–OCT: se copiaron intactos su PDF, 34 imágenes y el motor `js/reader.js`. Solo se modificaron su HTML para metadatos y enlaces de regreso y su CSS para dar estilo a esos enlaces. Se creó una imagen de vista previa social para su URL propia.
- Julio–agosto **no está incorporado** porque no se recibieron sus archivos ni se confirmó su URL.

## Google Analytics y redes sociales

Se conserva **GA4 `G-8M7XT80J57`** en los tres HTML. Cada una de las páginas tiene su ruta y título; GA4 permite analizar visitas por ruta. Se conservan los eventos de lectura del número vigente; la edición archivada mantiene `abrir_lector` y añade `descargar_pdf` al pulsar sus enlaces de descarga. La nueva entrada tiene el evento `abrir_hemeroteca` y en el catálogo se registran `abrir_edicion_anterior` y `descargar_pdf`, con `edicion` y `ubicacion` en sus parámetros.

Cada edición tiene su propia URL Open Graph y su propia tarjeta de 1200 × 630 px; el catálogo también tiene metadatos sociales. Esto **permite** que Facebook, WhatsApp y Telegram generen una vista previa, pero su presentación/caché depende de cada plataforma. Instagram no ofrece vistas previas Open Graph en todos sus formatos de publicación. No se incorporan Bitly, anuncios ni servicios de acortamiento. Los enlaces UTM entrantes son admitidos normalmente por GA4: no se eliminan ni reescriben.

**Pendiente tras publicar:** verificar los eventos en los informes en tiempo real/DebugView de la propiedad GA4, probar enlaces compartidos y actualizar sus cachés si fuera necesario. Este paquete se ha probado localmente y no se ha subido a GitHub.

## Pruebas de lectura recomendadas

- NOV–DIC escritorio: portada → 2–3 … → 32–33 → 34 → 35. Móvil: 1 … 35.
- SEP–OCT escritorio: portada → 2–3 … → 32–33 → 34. Móvil: 1 … 34.
- Abrir miniaturas, probar «Leer revista», anterior/siguiente, zoom y descarga de cada PDF.
- Probar volver a la hemeroteca y la edición actual desde la edición archivada.
