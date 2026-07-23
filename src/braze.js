/**
 * Braze Web SDK - Singleton client
 *
 * La API key (Web SDK) y el endpoint del SDK se configuran en las variables de entorno:
 *   VITE_BRAZE_API_KEY
 *   VITE_BRAZE_SDK_ENDPOINT
 *
 * Para obtenerlas: Braze Dashboard → Settings → API Keys / SDK Endpoint
 */

import {
  initialize,
  openSession,
  changeUser,
  subscribeToContentCardsUpdates,
  requestContentCardsRefresh,
  logContentCardClick,
} from "@braze/web-sdk";

const apiKey = import.meta.env.VITE_BRAZE_API_KEY;
const baseUrl = import.meta.env.VITE_BRAZE_SDK_ENDPOINT;

let _ready = false;

if (!apiKey || !baseUrl) {
  console.warn(
    "[Braze] VITE_BRAZE_API_KEY o VITE_BRAZE_SDK_ENDPOINT no configuradas. " +
    "Content Cards y demás features de Braze quedan deshabilitadas."
  );
} else {
  initialize(apiKey, { baseUrl });
  openSession();
  _ready = true;
}

/**
 * Asocia el usuario actual con su external_id real en Braze.
 * @param {string} externalId
 */
export function changeUserExternalId(externalId) {
  if (!_ready) return;
  changeUser(externalId);
}

/**
 * Se suscribe a actualizaciones de Content Cards y dispara un refresh inicial.
 * @param {(contentCards: import("@braze/web-sdk").ContentCards) => void} callback
 */
export function subscribeToContentCards(callback) {
  if (!_ready) return;
  subscribeToContentCardsUpdates(callback);
  requestContentCardsRefresh();
}

/**
 * Registra el click de una Content Card en Braze.
 * @param {import("@braze/web-sdk").Card} card
 */
export function logCardClick(card) {
  if (!_ready) return;
  logContentCardClick(card);
}
