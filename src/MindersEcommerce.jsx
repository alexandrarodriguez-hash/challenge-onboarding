import { useState, useEffect, useRef } from "react";
import { Search, User, ShoppingCart, X, Plus, Minus, Check, ArrowRight } from "lucide-react";
import ampli from "./ampli/index.js";

// ─── Ampli Initialization ──────────────────────────────────────────────────────
// Ampli envía eventos directamente a Amplitude desde el browser.
// El backend sigue siendo el canal para Braze (/api/events/*).
// Ambos canales conviven: dual-track para máxima cobertura.
ampli.load({
  environment: import.meta.env.PROD ? "production" : "development",
  client: {
    apiKey: import.meta.env.VITE_AMPLITUDE_API_KEY,
  },
});

const PRODUCTS = [
  { id: 1, tag: "Asientos", title: "Silla Fenda", price: 189, img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80", desc: "Silla de roble macizo con respaldo curvo y tapizado en lino crudo. Fabricación artesanal, ideal para comedor o escritorio." },
  { id: 2, tag: "Iluminación", title: "Lámpara Orla", price: 96, img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80", desc: "Lámpara de mesa con pantalla de lino y base de cerámica esmaltada a mano. Luz cálida regulable." },
  { id: 3, tag: "Accesorios", title: "Mochila Kesto", price: 129, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80", desc: "Mochila de lona encerada resistente al agua con correas de cuero vegetal y compartimento acolchado." },
  { id: 4, tag: "Calzado", title: "Sneaker Muro", price: 145, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80", desc: "Zapatilla minimalista en piel texturizada con suela de goma reciclada y plantilla de corcho." },
  { id: 5, tag: "Audio", title: "Auriculares Halo", price: 159, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80", desc: "Auriculares inalámbricos con cancelación de ruido pasiva, almohadillas de memoria y 30h de batería." },
  { id: 6, tag: "Hogar", title: "Maceta Tero", price: 42, img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80", desc: "Maceta de cerámica con acabado mate y plato integrado, disponible en tres tamaños." },
  { id: 7, tag: "Accesorios", title: "Reloj Lino", price: 210, img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80", desc: "Reloj de correa de cuero italiano y caja de acero cepillado. Movimiento de cuarzo japonés." },
  { id: 8, tag: "Accesorios", title: "Lentes Solaro", price: 88, img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80", desc: "Lentes de sol con marco de acetato y lentes polarizadas con protección UV400." },
];

const fmt = (n) => "$" + n.toFixed(2);

// URL del backend Java (minders-braze-backend). Cambiar en producción
// por la URL real desplegada, o inyectarla vía variable de entorno del
// bundler que estés usando (Vite, CRA, Next, etc).
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// Mapa EXACTO de la taxonomía: nombre de evento -> endpoint del backend.
// Ni los nombres de evento ni las propiedades se modifican ni se arman
// concatenando texto (ej. nada de "Product Viewed · " + nombre); el
// nombre del evento viaja tal cual, y las propiedades van en su propio
// objeto, tal como las define la taxonomía de Amplitude.
const EVENT_ENDPOINTS = {
  "Page Viewed": "/api/events/page-viewed",
  "Product Viewed": "/api/events/product-viewed",
  "Product Added to Cart": "/api/events/product-added-to-cart",
  "Order Completed": "/api/events/order-completed",
};

export default function MindersEcommerce() {
  const [cart, setCart] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("product"); // product | cart | confirm
  const [journeyStep, setJourneyStep] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [badgeBump, setBadgeBump] = useState(false);
  const firedPageView = useRef(false);

  // Id anónimo del visitante, persistente durante la sesión del tab.
  // En una app real conviene guardarlo en localStorage para que
  // sobreviva a recargas. Al hacer login, este id se REEMPLAZA por el
  // external_id real del usuario (ver loginDemo/identifyUser más abajo).
  const [userId, setUserId] = useState(
    () => "anon-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random())
  );

  // "guest" mientras no haya login; pasa a "registered" tras identificar
  // al usuario en Braze. Alimenta la User Property customer_type que se
  // manda en el evento Order Completed.
  const [customerType, setCustomerType] = useState("guest");

  useEffect(() => {
    if (!firedPageView.current) {
      firedPageView.current = true;
      // Hito 1: carga de la página -> "Page Viewed" { page_name }
      // Dual-track: Braze (via backend) + Amplitude (via Ampli)
      trackAnalyticsEvent("Page Viewed", { page_name: "Home" });
      ampli.pageViewed({ page_name: "Home" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Simula un login: en una app real esto se llama justo después de que
   * el backend confirme las credenciales del usuario, usando el id real
   * de ese usuario en tu sistema (nunca un valor inventado en el front).
   *
   * Funde en Braze el historial anónimo (userId actual, "anon-...") con
   * el external_id real, y a partir de acá todos los eventos siguientes
   * se mandan ya con ese external_id.
   */
  async function loginDemo() {
    const emailInput = prompt("¡Únete al club y recibe un 15% de descuento! Déjanos tu email:");
    if (emailInput === null) return; // Si cancela el prompt, salimos
    if (!emailInput.trim()) {
      alert("Por favor ingresa un correo válido.");
      return;
    }

    const externalId = "user-" + Math.floor(Math.random() * 100000);
    try {
      const res = await fetch(API_BASE + "/api/users/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId: userId, externalId, email: emailInput.trim() }),
      });
      const data = await res.json();
      showToast("Identify · " + externalId + (data.sentToBraze ? "" : " · Braze no configurado"));
      
      // Identificamos al usuario en el SDK de Amplitude (vía Ampli)
      ampli.identify(externalId, {
        email: emailInput.trim(),
        customer_type: "registered"
      });
    } catch (err) {
      console.error("No se pudo contactar al backend:", err);
      showToast("Identify · backend no disponible");
    }
    setUserId(externalId);
    setCustomerType("registered");
  }

  function showToast(label) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, name: label }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }

  /**
   * Función centralizada de tracking. Es el ÚNICO punto del front que
   * habla con el backend de analítica: toma un eventName que debe existir
   * tal cual en la taxonomía (ver EVENT_ENDPOINTS) y sus properties ya
   * armadas con los nombres exactos que espera cada evento, y hace el
   * POST correspondiente. El backend a su vez lo traduce y lo envía a
   * Braze (/users/track).
   *
   * Nunca rompe el flujo del usuario: si el backend no responde o Braze
   * no está configurado, solo se avisa en el toast y la navegación/compra
   * sigue funcionando igual.
   */
  async function trackAnalyticsEvent(eventName, properties = {}) {
    const path = EVENT_ENDPOINTS[eventName];
    if (!path) {
      console.warn(`trackAnalyticsEvent: "${eventName}" no existe en la taxonomía definida.`);
      return;
    }

    try {
      const res = await fetch(API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...properties }),
      });

      if (!res.ok) {
        showToast(`${eventName} · error ${res.status}`);
        return;
      }

      const data = await res.json();
      showToast(eventName + (data.sentToBraze ? "" : " · Braze no configurado"));
    } catch (err) {
      console.error("No se pudo contactar al backend:", err);
      showToast(eventName + " · backend no disponible");
    }
  }

  function bumpBadge() {
    setBadgeBump(true);
    setTimeout(() => setBadgeBump(false), 350);
  }

  // Hito 2: apertura del drawer de producto -> "Product Viewed"
  // { product_id, product_name, price }
  function openProduct(p) {
    setCurrentProduct(p);
    setQty(1);
    setDrawerMode("product");
    setJourneyStep(1);
    setDrawerOpen(true);
    // Dual-track: Braze (via backend) + Amplitude (via Ampli)
    trackAnalyticsEvent("Product Viewed", {
      product_id: String(p.id),
      product_name: p.title,
      price: p.price,
    });
    ampli.productViewed({
      product_id: String(p.id),
      product_name: p.title,
      price: p.price,
    });
  }

  // Hito 3: clic en "Agregar al carrito" -> "Product Added to Cart"
  // { product_id, quantity }
  function addToCart() {
    setCart((c) => ({ ...c, [currentProduct.id]: (c[currentProduct.id] || 0) + qty }));
    bumpBadge();
    // Dual-track: Braze (via backend) + Amplitude (via Ampli)
    trackAnalyticsEvent("Product Added to Cart", {
      product_id: String(currentProduct.id),
      quantity: qty,
    });
    ampli.productAddedToCart({
      product_id: String(currentProduct.id),
      quantity: qty,
    });
    setDrawerMode("cart");
    setJourneyStep(2);
  }

  function openCart() {
    const hasItems = Object.values(cart).some((q) => q > 0);
    setDrawerMode("cart");
    setJourneyStep(hasItems ? 2 : 1);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  const cartLines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ product: PRODUCTS.find((p) => p.id === Number(id)), qty: q }));

  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0);
  const subtotal = cartLines.reduce((a, l) => a + l.product.price * l.qty, 0);
  const shipping = subtotal > 150 || subtotal === 0 ? 0 : 9.9;
  const total = subtotal + shipping;

  // Hito 4: confirmación de la compra -> "Order Completed"
  // { order_id, revenue }
  // customerType e items no son Event Properties de Amplitude: el backend
  // los usa aparte para actualizar las User Properties (lifetime_value,
  // customer_type, first_purchase_date) y para dar granularidad de
  // producto a Braze. Ver EventTrackingService en el backend.
  function completeOrder() {
    setDrawerMode("confirm");
    setJourneyStep(3);

    const orderId = "ORD-" + Date.now();
    // Dual-track: Braze (via backend) + Amplitude (via Ampli)
    trackAnalyticsEvent("Order Completed", {
      order_id: orderId,
      revenue: total,
      customerType, // "guest" o "registered", según haya login o no
      items: cartLines.map((l) => ({
        productId: String(l.product.id),
        productName: l.product.title,
        price: l.product.price,
        quantity: l.qty,
      })),
    });
    ampli.orderCompleted({ order_id: orderId, revenue: total });

    setCart({});
    setTimeout(() => setDrawerOpen(false), 2400);
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-6 py-4">
          <div className="font-serif italic text-xl font-medium tracking-tight whitespace-nowrap">
            Minders Ecommerce
          </div>

          <div className="relative flex-1 max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar productos…"
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-neutral-100 border border-neutral-200 text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {customerType === "guest" ? (
              <button
                onClick={loginDemo}
                className="px-3.5 h-10 flex items-center gap-2 rounded-full hover:bg-neutral-100 hover:-translate-y-0.5 transition-all text-sm font-medium"
                aria-label="Iniciar sesión"
                title="Simula un login: funde tu historial anónimo con un external_id en Braze"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </button>
            ) : (
              <div
                className="px-3.5 h-10 flex items-center gap-2 rounded-full bg-neutral-100 text-sm font-medium"
                title={userId}
              >
                <User className="w-5 h-5 text-indigo-600" />
                <span className="hidden sm:inline">{userId}</span>
              </div>
            )}
            <button
              aria-label="Carrito"
              onClick={openCart}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 hover:-translate-y-0.5 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span
                className={`absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center leading-none transition-transform duration-300 ${
                  badgeBump ? "scale-125" : "scale-100"
                }`}
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-5 mt-5 rounded-3xl overflow-hidden bg-neutral-900 min-h-[420px] flex items-center">
        <img
          src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=80"
          alt="Interior cálido y minimalista"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/40 to-transparent" />
        <div className="relative z-10 max-w-6xl w-full mx-auto px-10 py-16">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Colección de invierno
          </div>
          <h1 className="font-serif font-medium text-4xl md:text-5xl leading-tight text-white max-w-xl tracking-tight">
            Objetos hechos para acompañar tu rutina, no para interrumpirla
          </h1>
          <p className="mt-4 text-neutral-200 max-w-md text-base leading-relaxed">
            Piezas simples, bien construidas, para el espacio en el que realmente vives.
          </p>
          <a
            href="#gallery"
            className="inline-flex items-center gap-2 mt-8 px-7 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-600/30"
          >
            Comprar ahora
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-9">
          <div>
            <h2 className="font-serif font-medium text-3xl tracking-tight">Destacados de la temporada</h2>
            <p className="text-neutral-500 text-sm mt-1.5">Selección curada · actualizada cada semana</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            Cada tarjeta dispara <strong className="text-neutral-700">Product Viewed</strong> al abrir el detalle
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((p) => (
            <div
              key={p.id}
              className="group bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-transparent"
            >
              <div className="aspect-square bg-neutral-100 overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">{p.tag}</div>
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-sm text-neutral-500 mb-3">{fmt(p.price)}</div>
                <button
                  onClick={() => openProduct(p)}
                  className="mt-auto w-full py-2.5 border-2 border-neutral-900 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-900 hover:text-white"
                >
                  Ver detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-neutral-400 text-xs py-12">
        Minders Ecommerce · demo de interfaz para instrumentar el user journey de e-commerce
      </footer>

      {/* OVERLAY */}
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 bg-black/45 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* DRAWER */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
          <div className="font-serif font-medium text-lg">
            {drawerMode === "product" && "Detalle del producto"}
            {drawerMode === "cart" && "Tu carrito"}
            {drawerMode === "confirm" && "Pedido confirmado"}
          </div>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* journey track */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {["Visto", "Agregado", "Comprado"].map((label, i) => {
            const step = i + 1;
            const done = step <= journeyStep;
            return (
              <div className="flex-1 flex flex-col gap-2" key={label}>
                <div className="h-1 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className={`h-full bg-indigo-600 transition-all duration-500 ${done ? "w-full" : "w-0"}`}
                  />
                </div>
                <div className={`text-xs uppercase tracking-wide font-semibold ${done ? "text-neutral-900" : "text-neutral-400"}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
          {drawerMode === "product" && currentProduct && (
            <div>
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-5">
                <img src={currentProduct.img} alt={currentProduct.title} className="w-full h-full object-cover" />
              </div>
              <div className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">{currentProduct.tag}</div>
              <div className="font-serif font-medium text-2xl mt-1.5 tracking-tight">{currentProduct.title}</div>
              <div className="text-lg font-bold text-indigo-600 mt-1.5">{fmt(currentProduct.price)}</div>
              <p className="mt-4 text-sm text-neutral-500 leading-relaxed">{currentProduct.desc}</p>

              <div className="flex items-center gap-4 mt-6">
                <span className="text-sm font-semibold text-neutral-500">Cantidad</span>
                <div className="flex items-center border border-neutral-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={addToCart}
                className="w-full mt-7 py-4 bg-neutral-900 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-indigo-600/30"
              >
                <ShoppingCart className="w-4 h-4" />
                Agregar al carrito
              </button>
            </div>
          )}

          {drawerMode === "cart" && (
            <div>
              {cartLines.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
                  Tu carrito está vacío.
                  <br />
                  <button onClick={closeDrawer} className="mt-4 font-semibold text-indigo-600 border-b-2 border-indigo-600">
                    Explorar productos
                  </button>
                </div>
              ) : (
                <>
                  {cartLines.map((l) => (
                    <div key={l.product.id} className="flex gap-3.5 py-3.5 border-b border-neutral-200">
                      <img src={l.product.img} alt={l.product.title} className="w-16 h-16 rounded-xl object-cover bg-neutral-100" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{l.product.title}</div>
                        <div className="text-xs text-neutral-500 mt-1">Cantidad: {l.qty}</div>
                      </div>
                      <div className="text-sm font-bold whitespace-nowrap">{fmt(l.product.price * l.qty)}</div>
                    </div>
                  ))}

                  <div className="mt-5 pt-4 border-t border-dashed border-neutral-200">
                    <div className="flex justify-between text-sm text-neutral-500 py-1">
                      <span>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-neutral-500 py-1">
                      <span>Envío</span>
                      <span>{shipping === 0 ? "Gratis" : fmt(shipping)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2.5 mt-1.5 border-t border-neutral-200">
                      <span>Total</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={completeOrder}
                    className="w-full mt-7 py-4 bg-neutral-900 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-indigo-600/30"
                  >
                    <Check className="w-4 h-4" />
                    Finalizar compra
                  </button>
                </>
              )}
            </div>
          )}

          {drawerMode === "confirm" && (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-medium text-xl">¡Gracias por tu compra!</h3>
              <p className="text-sm text-neutral-500 mt-2">
                Total pagado: <strong className="text-neutral-900">{fmt(total)}</strong>
                <br />
                Te enviaremos la confirmación por correo.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* TOASTS */}
      <div className="fixed left-5 bottom-5 z-50 flex flex-col-reverse gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 bg-neutral-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Evento: <strong>{t.name}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
