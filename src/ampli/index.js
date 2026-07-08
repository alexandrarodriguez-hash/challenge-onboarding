/**
 * Ampli - Typed Amplitude tracking wrapper
 * Generado basado en la taxonomía de Minders Ecommerce.
 *
 * Este archivo fue estructurado manualmente siguiendo la taxonomía definida.
 * Una vez que corras `ampli pull` con tu API Key de Amplitude Data, este
 * archivo será REEMPLAZADO por el código auto-generado por la CLI oficial.
 *
 * Pasos para reemplazarlo con el código oficial:
 *   1. npm install -g @amplitude/ampli
 *   2. ampli login
 *   3. ampli pull --path src/ampli
 *
 * Documentación: https://www.docs.developers.amplitude.com/data/sdks/ampli/
 */

import * as amplitude from "@amplitude/analytics-browser";

// ─── Inicialización ───────────────────────────────────────────────────────────

let _initialized = false;

/**
 * Inicializa el SDK de Amplitude con tu API Key.
 * Llama a esto una sola vez, antes de cualquier evento.
 */
export function load({ environment, client }) {
  const apiKey = client?.apiKey || import.meta.env.VITE_AMPLITUDE_API_KEY;

  if (!apiKey || apiKey === "CHANGE_ME") {
    console.warn("[Ampli] VITE_AMPLITUDE_API_KEY no configurada. Los eventos no se enviarán a Amplitude.");
    return;
  }

  amplitude.init(apiKey, {
    defaultTracking: false, // Solo trackeamos eventos de nuestra taxonomía
    ...client?.configuration,
  });

  _initialized = true;
  console.info(`[Ampli] Inicializado en entorno "${environment}".`);
}

/**
 * Identifica al usuario. Fusiona el historial anónimo con el external_id
 * real cuando el usuario inicia sesión.
 */
export function identify(userId, properties) {
  if (!_initialized) return;
  amplitude.setUserId(userId);
  if (properties) {
    const identifyEvent = new amplitude.Identify();
    Object.entries(properties).forEach(([key, value]) => {
      identifyEvent.set(key, value);
    });
    amplitude.identify(identifyEvent);
  }
}

// ─── Eventos de la Taxonomía ──────────────────────────────────────────────────
// Cada función corresponde 1:1 a un evento de la taxonomía estricta.
// Los nombres de evento y sus propiedades están fijados y NO se modifican.

/**
 * Page Viewed
 * Categoría: Navigation
 * Se dispara cuando el usuario carga cualquier página de la tienda.
 *
 * @param {Object} properties
 * @param {string} properties.page_name - Nombre específico de la página o pantalla visitada.
 */
export function pageViewed(properties) {
  if (!_initialized) return;
  amplitude.track("Page Viewed", {
    page_name: properties.page_name,
  });
}

/**
 * Product Viewed
 * Categoría: E-commerce
 * Se dispara cuando el usuario abre la vista detallada de un producto.
 *
 * @param {Object} properties
 * @param {string} properties.product_id    - Identificador único del producto.
 * @param {string} properties.product_name  - Nombre del producto.
 * @param {number} properties.price         - Precio unitario del producto.
 */
export function productViewed(properties) {
  if (!_initialized) return;
  amplitude.track("Product Viewed", {
    product_id:   properties.product_id,
    product_name: properties.product_name,
    price:        properties.price,
  });
}

/**
 * Product Added to Cart
 * Categoría: E-commerce
 * Se dispara cuando el usuario hace clic en "Agregar al carrito".
 *
 * @param {Object} properties
 * @param {string} properties.product_id - Identificador único del producto agregado.
 * @param {number} properties.quantity   - Cantidad de unidades agregadas.
 */
export function productAddedToCart(properties) {
  if (!_initialized) return;
  amplitude.track("Product Added to Cart", {
    product_id: properties.product_id,
    quantity:   properties.quantity,
  });
}

/**
 * Order Completed
 * Categoría: Conversion
 * Se dispara cuando el usuario finaliza la compra.
 *
 * @param {Object} properties
 * @param {string} properties.order_id - Identificador único de la orden.
 * @param {number} properties.revenue  - Valor total de la compra (ingresos).
 */
export function orderCompleted(properties) {
  if (!_initialized) return;
  amplitude.track("Order Completed", {
    order_id: properties.order_id,
    revenue:  properties.revenue,
  });
}

// ─── Export default (estilo Ampli oficial) ────────────────────────────────────
const ampli = { load, identify, pageViewed, productViewed, productAddedToCart, orderCompleted };
export default ampli;
