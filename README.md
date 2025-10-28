# Acta de Entrega de Áreas - Versión Preact

Una aplicación moderna construida con Preact para gestionar las actas de entrega de áreas en centros de convenciones. Esta versión incluye un diseño minimalista con colores sobrios (blanco, negro y gris).

## Características

- **Diseño Minimalista**: Interfaz limpia y profesional con paleta de colores en escala de grises
- **Modular**: Tres módulos principales (Revisión, Consulta y Daños)
- **Autenticación**: Login con Microsoft OAuth
- **Almacenamiento**: Firebase Realtime Database
- **Notificaciones**: Envío automático de correos con EmailJS
- **Responsive**: Optimizado para dispositivos móviles y escritorio
- **Carga de Imágenes**: Subida de imágenes a Firebase Storage

## Tecnologías Utilizadas

- **Preact**: Framework ligero para la UI
- **Vite**: Herramienta de build rápida
- **Firebase**: Backend as a Service (Auth, Database, Storage)
- **EmailJS**: Servicio de envío de correos
- **CSS Variables**: Para un sistema de diseño consistente

## Instalación y Configuración

### Prerrequisitos

- Node.js (versión 16 o superior)
- pnpm (gestor de paquetes)

### Pasos de Instalación

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar Firebase:**
   - Las credenciales ya están configuradas en `src/config/firebase.js`
   - Verificar que el proyecto Firebase esté activo

3. **Configurar EmailJS:**
   - Las configuraciones están en `src/config/email.js`
   - Verificar que los servicios de EmailJS estén activos

### Comandos Disponibles

```bash
# Modo desarrollo
pnpm dev

# Build para producción
pnpm build

# Previsualizar build
pnpm preview

# Construir para producción
npm run build

# Vista previa de la build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ImageUpload.jsx
│   ├── Login.jsx
│   ├── Modal.jsx
│   ├── Navigation.jsx
│   └── Spinner.jsx
├── config/              # Configuraciones
│   ├── email.js
│   └── firebase.js
├── hooks/               # Custom hooks
│   ├── useAuth.js
│   └── useEntregas.js
├── modules/             # Módulos principales
│   ├── ModuloConsultaEntregas.jsx
│   ├── ModuloReporteDanos.jsx
│   └── ModuloRevisionArea.jsx
├── styles/              # Estilos globales
│   └── global.css
├── utils/               # Utilidades
│   └── constants.js
├── App.jsx              # Componente principal
└── main.jsx             # Punto de entrada
```

## Funcionalidades

### Módulo de Revisión
- Formulario para crear nuevas actas de entrega
- Selección múltiple de salones
- Registro de infraestructura y novedades
- Carga de imágenes para daños
- Envío automático por correo

### Módulo de Consulta
- Búsqueda de actas existentes
- Visualización detallada de entregas
- Reenvío de correos
- Impresión de actas
- **Requiere autenticación**

### Módulo de Daños
- Generación de reportes de daños
- Asignación de precios a daños
- Envío de reportes por correo
- **Requiere autenticación**

## Diseño y Estilos

La aplicación utiliza un sistema de diseño minimalista con:

- **Colores principales**: Escala de grises (#2d2d2d, #6b6b6b, #fafafa, #ffffff)
- **Tipografía**: System fonts para mejor rendimiento
- **Espaciado**: Sistema basado en variables CSS
- **Componentes**: Diseño modular y reutilizable
- **Responsive**: Mobile-first approach

## Variables CSS Principales

```css
:root {
  --color-primary: #2d2d2d;
  --color-secondary: #6b6b6b;
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e5e5e5;
  --color-accent: #000000;
}
```

## Configuración de Producción

Para desplegar en producción:

1. **Construir la aplicación:**
   ```bash
   npm run build
   ```

2. **Subir el contenido de `dist/` a tu servidor web**

3. **Configurar redirecciones para SPA:**
   - Todas las rutas deben servir `index.html`

## Soporte

La aplicación está optimizada para:
- Chrome, Firefox, Safari, Edge (versiones modernas)
- Dispositivos móviles iOS y Android
- Tablets y escritorio

## Notas de Desarrollo

- Los estilos están centralizados en `src/styles/global.css`
- Las constantes de la aplicación están en `src/utils/constants.js`
- Los hooks personalizados manejan la lógica de autenticación y datos
- La aplicación utiliza Firebase v8 (compatibilidad con la versión original)

## Diferencias con la Versión Original

- **Framework**: Migrado de React a Preact
- **Diseño**: Completamente rediseñado con estética minimalista
- **Arquitectura**: Mejor organización modular
- **Performance**: Optimizada para carga más rápida
- **Maintainability**: Código más limpio y documentado
