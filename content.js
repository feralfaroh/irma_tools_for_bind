/**
 * Bind ERP - Fix Address Selection
 * Arregla el bug de reseteo de direcciones en modo edición de pedidos
 */

(function() {
    'use strict';

    // Verificar si el parche está desactivado
    if (new URLSearchParams(window.location.search).has('bind-nopatch')) {
        console.log('[Bind Address Fix] Parche desactivado por URL');
        return;
    }

    // Funciones utilitarias
    const utils = {
        /**
         * Genera clave para localStorage
         */
        key: (orderId) => `bind:order:${orderId}:store`,

        /**
         * Guarda datos en localStorage
         */
        save: (key, data) => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.error('[Bind Address Fix] Error al guardar:', e);
                return false;
            }
        },

        /**
         * Carga datos de localStorage
         */
        load: (key) => {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('[Bind Address Fix] Error al cargar:', e);
                return null;
            }
        },

        /**
         * Normaliza texto para comparaciones
         */
        norm: (text) => {
            return String(text || '').trim().replace(/\s+/g, ' ').toLowerCase();
        },

        /**
         * Dispara eventos en un elemento
         */
        fire: (element, eventType) => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            element.dispatchEvent(event);
        },

        /**
         * Verifica si el select tiene un valor válido (no la primera opción)
         */
        hasValue: (select) => {
            return select.value && select.value !== select.options[0]?.value;
        },

        /**
         * Extrae la dirección del pedido en OrderDetails
         */
        extractAddressLabelFromOrderDetails: () => {
            // Buscar el span que contiene "Dirección:"
            const allSpans = document.querySelectorAll('span');
            for (let i = 0; i < allSpans.length; i++) {
                const span = allSpans[i];
                if (span.textContent && span.textContent.includes('Dirección:')) {
                    // La dirección está en el siguiente elemento (ng-transclude)
                    const siguiente = span.nextElementSibling;
                    if (siguiente) {
                        // Buscar el span con la dirección dentro del ng-transclude
                        const spanDireccion = siguiente.querySelector('span.ng-binding.ng-scope');
                        if (spanDireccion) {
                            return spanDireccion.textContent.trim();
                        }
                    }
                }
            }
            return null;
        }
    };

    /**
     * Maneja la página OrderDetails - extrae y guarda la dirección
     */
    function handleOrderDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('ID');
        
        if (!orderId) return;

        // Esperar a que la página cargue completamente
        setTimeout(() => {
            const addressLabel = utils.extractAddressLabelFromOrderDetails();
            if (addressLabel) {
                const storeData = {
                    storeLabel: addressLabel,
                    timestamp: Date.now()
                };
                
                if (utils.save(utils.key(orderId), storeData)) {
                    console.log('[Bind Address Fix] Dirección guardada:', addressLabel);
                }
            }
        }, 1000);
    }

    /**
     * Adjunta listener para detectar cambios manuales del usuario
     */
    function attachUserListener(select) {
        let userChanged = false;
        
        const listener = () => {
            userChanged = true;
            select.removeEventListener('change', listener);
            
            // Actualizar localStorage con la nueva selección
            const orderId = new URLSearchParams(window.location.search).get('ID');
            if (orderId && select.value) {
                const selectedOption = select.options[select.selectedIndex];
                const storeData = {
                    storeId: select.value.replace(/^string:/, ''),
                    storeLabel: selectedOption.textContent.trim(),
                    timestamp: Date.now(),
                    userSelected: true
                };
                utils.save(utils.key(orderId), storeData);
                console.log('[Bind Address Fix] Usuario cambió selección:', storeData);
            }
        };
        
        select.addEventListener('change', listener);
        return () => select.removeEventListener('change', listener);
    }

    /**
     * Verifica si el select está en estado inicial (primera opción seleccionada)
     */
    function isInitialState(select) {
        return select.selectedIndex === 0 || !utils.hasValue(select);
    }

    /**
     * Intenta aplicar la selección de dirección guardada
     */
    function tryApply(select, storeData) {
        if (!storeData || !storeData.storeLabel) return false;

        // Buscar opción que coincida
        for (let i = 0; i < select.options.length; i++) {
            const option = select.options[i];
            const optionText = utils.norm(option.textContent);
            const storeText = utils.norm(storeData.storeLabel);
            
            // Comparar por texto normalizado
            if (optionText === storeText) {
                select.value = option.value;
                utils.fire(select, 'input');
                utils.fire(select, 'change');
                utils.fire(select, 'blur');
                console.log('[Bind Address Fix] Dirección aplicada:', storeData.storeLabel);
                
                // 🎯 BORRAR DESPUÉS DE APLICAR - TAREA COMPLETADA
                const orderId = new URLSearchParams(window.location.search).get('ID');
                if (orderId) {
                    localStorage.removeItem(utils.key(orderId));
                    console.log('[Bind Address Fix] Dirección eliminada de memoria (tarea completada)');
                }
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Configura observadores y reintentos para AddOrder
     */
    function setupObserversAndRetries(select, storeData) {
        let attempts = 0;
        const maxAttempts = 20; // 5 segundos / 250ms
        let userChanged = false;
        let cleanup = null;

        // Adjuntar listener para cambios del usuario
        cleanup = attachUserListener(select);

        // Función de reintento
        const retry = () => {
            if (userChanged || attempts >= maxAttempts) {
                if (cleanup) cleanup();
                return;
            }

            attempts++;
            
            // Solo aplicar si está en estado inicial
            if (isInitialState(select)) {
                tryApply(select, storeData);
            }

            // Programar siguiente intento
            setTimeout(retry, 250);
        };

        // Observador para cambios en el select
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Si el select cambió, verificar si necesita re-aplicación
                    if (isInitialState(select)) {
                        setTimeout(() => tryApply(select, storeData), 100);
                    }
                }
            }
        });

        observer.observe(select, {
            childList: true,
            attributes: true,
            subtree: true
        });

        // Iniciar reintentos
        retry();

        // Limpiar observador después de 5 segundos
        setTimeout(() => {
            observer.disconnect();
            if (cleanup) cleanup();
        }, 5000);
    }

    /**
     * Maneja la página AddOrder en modo edición
     */
    function handleAddOrderEdit() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('ID');
        const isEdit = urlParams.get('edit') === '1';
        
        if (!orderId || !isEdit) return;

        // Cargar datos de la dirección guardada
        const storeData = utils.load(utils.key(orderId));
        if (!storeData) {
            console.log('[Bind Address Fix] No hay datos de dirección guardados');
            return;
        }

        console.log('[Bind Address Fix] Datos de dirección cargados:', storeData);

        // Función para buscar y configurar el select
        const findAndSetupSelect = () => {
            const select = document.querySelector('select[data-model="vm.model.address"]');
            
            if (select && select.options.length > 0) {
                // Si el select ya tiene un valor válido, no hacer nada
                if (utils.hasValue(select)) {
                    console.log('[Bind Address Fix] Select ya tiene valor válido, no se modifica');
                    return;
                }
                
                // Configurar observadores y reintentos
                setupObserversAndRetries(select, storeData);
            } else {
                // Reintentar en 300ms y 1200ms
                setTimeout(findAndSetupSelect, 300);
                setTimeout(findAndSetupSelect, 1200);
            }
        };

        // Iniciar búsqueda del select
        findAndSetupSelect();
    }

    /**
     * Función principal que determina qué página estamos y ejecuta la lógica correspondiente
     */
    function main() {
        const path = window.location.pathname;
        
        if (path.includes('/Sales/OrderDetails')) {
            handleOrderDetails();
        } else if (path.includes('/Sales/AddOrder')) {
            handleAddOrderEdit();
        }
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    // También ejecutar en cambios de URL (SPA)
    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(main, 500); // Pequeño delay para que la página cargue
        }
    });

    urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
