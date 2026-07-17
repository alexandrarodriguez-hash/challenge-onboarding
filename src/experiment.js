/**
 * Amplitude Experiment - Singleton client
 *
 * Deployment: amplistore-experiment
 * Flag key:   shipping-cost-display
 * Variants:
 *   - control   → no muestra nada adicional (baseline)
 *   - treatment → muestra costo de envío estimado prominentemente en el carrito
 *
 * La deployment key (CLIENT key) se configura en la variable de entorno:
 *   VITE_AMPLITUDE_EXPERIMENT_KEY
 *
 * Para obtenerla: Amplitude → Experiment → Deployments → amplistore-experiment → Client key
 */

import { Experiment } from "@amplitude/experiment-js-client";

// ─── FLAG KEY del experimento ─────────────────────────────────────────────────
export const EXPERIMENT_FLAG_KEY = "shipping-cost-display";

// ─── Variantes posibles ───────────────────────────────────────────────────────
export const VARIANT_CONTROL   = "control";
export const VARIANT_TREATMENT = "treatment";

// ─── Inicialización lazy del cliente ─────────────────────────────────────────
let _client = null;

function getClient() {
  if (_client) return _client;

  const deploymentKey = import.meta.env.VITE_AMPLITUDE_EXPERIMENT_KEY;

  if (!deploymentKey || deploymentKey === "CHANGE_ME") {
    console.warn(
      "[Experiment] VITE_AMPLITUDE_EXPERIMENT_KEY no configurada. " +
      "Todos los usuarios verán la variante 'control'."
    );
    return null;
  }

  _client = Experiment.initializeWithAmplitudeAnalytics(deploymentKey, {
    fetchTimeoutMillis: 2000,
    retryFetchOnFailure: false,
    automaticExposureTracking: true,  // trackea exposición automáticamente en Amplitude
  });

  return _client;
}

/**
 * Obtiene la variante del experimento para el usuario actual.
 * Si Amplitude Experiment no está configurado o falla, devuelve "control"
 * para no romper la experiencia del usuario.
 *
 * @returns {Promise<"control" | "treatment">}
 */
export async function fetchVariant() {
  const client = getClient();
  if (!client) return VARIANT_CONTROL;

  try {
    await client.fetch();
    const variant = client.variant(EXPERIMENT_FLAG_KEY);
    const value = variant?.value ?? VARIANT_CONTROL;
    console.info(`[Experiment] ${EXPERIMENT_FLAG_KEY} → ${value}`);
    return value;
  } catch (err) {
    console.warn("[Experiment] Error al obtener variante, usando control:", err.message);
    return VARIANT_CONTROL;
  }
}
