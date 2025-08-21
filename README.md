# Bind ERP - Fix Address Selection

Extensión de Chrome que soluciona el bug de reseteo de direcciones en modo edición de pedidos de Bind ERP.

## Problema

En Bind ERP, cuando se edita un pedido existente:
- En `OrderDetails` se muestra la dirección correcta del pedido
- En `AddOrder?edit=1` el selector de direcciones se resetea a la primera opción

Esta extensión mantiene la selección de dirección correcta durante la edición.

## Funcionalidades

- **OrderDetails**: Extrae automáticamente la dirección del pedido y la guarda en localStorage
- **AddOrder (edición)**: Re-aplica automáticamente la dirección guardada
- **Anti-rebote**: Sistema robusto que maneja recargas del selector durante 5 segundos
- **Respeto al usuario**: Si el usuario cambia manualmente la selección, no se sobreescribe
- **Desactivación**: Se puede desactivar agregando `&bind-nopatch=1` a la URL

## Instalación

### Método 1: Cargar extensión no empaquetada

1. Descarga o clona este repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa "Modo desarrollador" (esquina superior derecha)
4. Haz clic en "Cargar extensión no empaquetada"
5. Selecciona la carpeta que contiene `manifest.json` y `content.js`

### Método 2: Empaquetar e instalar

1. Haz clic en "Empaquetar extensión" en `chrome://extensions/`
2. Selecciona la carpeta del proyecto
3. Instala el archivo `.crx` generado

## Uso

1. **Instala la extensión** siguiendo los pasos de instalación
2. **Navega a un pedido** en Bind ERP (`/Sales/OrderDetails?ID=...`)
3. **La extensión detectará automáticamente** la dirección y la guardará
4. **Edita el pedido** (`/Sales/AddOrder?ID=...&edit=1`)
5. **La dirección se mantendrá seleccionada** automáticamente

## Desactivación

Para desactivar la extensión en una página específica, agrega `&bind-nopatch=1` a la URL:

```
https://app.bind.com.mx/Sales/AddOrder?ID=123&edit=1&bind-nopatch=1
```

## Estructura de archivos

```
├── manifest.json      # Configuración de la extensión (Manifest V3)
├── content.js         # Lógica principal del parche
└── README.md          # Este archivo
```

## Permisos requeridos

- `storage`: Para guardar direcciones en localStorage
- `activeTab`: Para acceder a la pestaña activa
- `scripting`: Para ejecutar scripts en páginas de Bind ERP
- `host_permissions`: Para acceder a `https://app.bind.com.mx/*`

## Compatibilidad

- Chrome 88+ (Manifest V3)
- Bind ERP en `https://app.bind.com.mx/`

## Logs

La extensión registra información en la consola del navegador con el prefijo `[Bind Address Fix]` para facilitar el debugging.

## Contribuir

Si encuentras problemas o quieres mejorar la extensión:

1. Reporta bugs en los issues del repositorio
2. Propón mejoras mediante pull requests
3. Asegúrate de que el código mantenga la compatibilidad con Manifest V3
