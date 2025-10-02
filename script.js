
// ==========================
// Importar Firestore
// ==========================
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("productos");
  const carritoLista = document.getElementById("lista-carrito");
  const total = document.getElementById("total");
  const carrito = document.getElementById("carrito");
  const cerrarCarritoBtn = document.getElementById("cerrar-carrito");
  const carritoFlotante = document.getElementById("carrito-flotante");
  const contadorCarrito = document.getElementById("contador-carrito");
  const finalizarBtn = document.getElementById("finalizar-compra");
  const buscador = document.getElementById("buscador");
  const tabsContainer = document.querySelector(".tabs");

  // Modal
  const modal = document.getElementById("modal-producto");
  const cerrarModal = document.getElementById("cerrar-modal");
  const modalImagen = document.getElementById("modal-imagen");
  const modalNombre = document.getElementById("modal-nombre");
  const modalDescripcion = document.getElementById("modal-descripcion");
  const modalPrecio = document.getElementById("modal-precio");
  const modalAgregar = document.getElementById("modal-agregar");

  let carritoItems = JSON.parse(localStorage.getItem("carrito")) || [];
  let productos = [];
  let categorias = [];
  let productoActual = null;
  let todosLosProductos = []; // 🔹 Aquí guardamos todos los productos de todas las categorías

  // ==========================
  // Helpers
  // ==========================
  function cld(url, { w = 600, h = 600, q = "auto", f = "auto" } = {}) {
    if (!url || typeof url !== "string") return url;
    const marker = "/upload/";
    const ix = url.indexOf(marker);
    if (ix === -1 || !url.includes("res.cloudinary.com")) return url;
    const before = url.slice(0, ix + marker.length);
    const after = url.slice(ix + marker.length);
    const transform = `c_limit,w_${w},h_${h},q_${q},f_${f}`;
    if (after.startsWith("c_")) return url;
    return `${before}${transform}/${after}`;
  }

  function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carritoItems));
  }

  function setContador(valor, animar = false) {
    contadorCarrito.textContent = String(valor);
    if (animar) {
      contadorCarrito.classList.add("animar");
      carritoFlotante.classList.add("animar-shake");
      setTimeout(() => contadorCarrito.classList.remove("animar"), 300);
      setTimeout(() => carritoFlotante.classList.remove("animar-shake"), 400);
    }
  }
// ==========================
// Carrusel infinito con puntos de navegación
// ==========================
const carruselTrack = document.querySelector(".carrusel-track");
let carruselSlides = document.querySelectorAll(".carrusel-slide");
const carruselNav = document.querySelector(".carrusel-nav"); // contenedor de puntos

if (carruselTrack && carruselSlides.length > 0) {
  // Clonar primero y último
  const firstClone = carruselSlides[0].cloneNode(true);
  const lastClone = carruselSlides[carruselSlides.length - 1].cloneNode(true);
  firstClone.id = "first-clone";
  lastClone.id = "last-clone";
  carruselTrack.appendChild(firstClone);
  carruselTrack.insertBefore(lastClone, carruselSlides[0]);

  carruselSlides = document.querySelectorAll(".carrusel-slide");

  let indice = 1;
  let intervalo;

  // Crear puntos de navegación
  carruselNav.innerHTML = "";
  for (let i = 0; i < carruselSlides.length - 2; i++) {
    const dot = document.createElement("button");
    dot.classList.add("carrusel-dot");
    if (i === 0) dot.classList.add("active");
    dot.dataset.index = i + 1; // porque el índice real empieza en 1
    carruselNav.appendChild(dot);
  }

  const dots = document.querySelectorAll(".carrusel-dot");

  const actualizarPosicion = () => {
    carruselTrack.style.transform = `translateX(-${indice * 100}%)`;
    dots.forEach(dot => dot.classList.remove("active"));
    if (indice === 0) {
      dots[dots.length - 1].classList.add("active");
    } else if (indice === carruselSlides.length - 1) {
      dots[0].classList.add("active");
    } else {
      dots[indice - 1].classList.add("active");
    }
  };

  carruselTrack.style.transform = `translateX(-${indice * 100}%)`;

  function moverCarrusel() {
    if (indice >= carruselSlides.length - 1) return;
    indice++;
    carruselTrack.style.transition = "transform 0.5s ease-in-out";
    actualizarPosicion();
  }

  carruselTrack.addEventListener("transitionend", () => {
    if (carruselSlides[indice].id === "first-clone") {
      carruselTrack.style.transition = "none";
      indice = 1;
      actualizarPosicion();
    }
    if (carruselSlides[indice].id === "last-clone") {
      carruselTrack.style.transition = "none";
      indice = carruselSlides.length - 2;
      actualizarPosicion();
    }
  });

  // Navegar con puntos
  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      indice = parseInt(dot.dataset.index);
      carruselTrack.style.transition = "transform 0.5s ease-in-out";
      actualizarPosicion();
    });
  });

  function iniciarCarrusel() {
    intervalo = setInterval(moverCarrusel, 4000);
  }

  function detenerCarrusel() {
    clearInterval(intervalo);
  }

  iniciarCarrusel();
  carruselTrack.addEventListener("mouseenter", detenerCarrusel);
  carruselTrack.addEventListener("mouseleave", iniciarCarrusel);
}



  // ==========================
  // UI Carrito
  // ==========================
  carritoFlotante.addEventListener("click", () => carrito.classList.toggle("activo"));
  cerrarCarritoBtn.addEventListener("click", () => carrito.classList.remove("activo"));

  // ==========================
  // Cargar productos desde Firebase
  // ==========================
  const productosRef = collection(window.db, "productos");

  async function cargarProductosDesdeFirebase(categoria = "Altavoces") {
    try {
      const q = query(productosRef, where("categoria", "==", categoria));
      const snapshot = await getDocs(q);
      productos = [];
      snapshot.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));
      renderProductos(productos);
    } catch (error) {
      console.error("Error cargando productos desde Firebase:", error);
    }
  }

  // ==========================
  // Cargar todas las categorías y productos
  // ==========================
  async function cargarCategorias() {
    try {
      const snapshot = await getDocs(productosRef);
      categorias = [];
      todosLosProductos = []; // 🔹 Reiniciamos antes de volver a llenar

      snapshot.forEach(doc => {
        const data = doc.data();
        todosLosProductos.push({ id: doc.id, ...data }); // 🔹 Guardamos todos los productos
        if (data.categoria && !categorias.includes(data.categoria)) {
          categorias.push(data.categoria);
        }
      });

      // ===== Orden personalizado =====
      const ordenDeseado = ["Altavoces"];
      categorias.sort((a, b) => {
        const ia = ordenDeseado.indexOf(a);
        const ib = ordenDeseado.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      renderCategorias();
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  }

  // ==========================
  // Render categorías como pestañas
  // ==========================
  function renderCategorias() {
    tabsContainer.innerHTML = "";
    categorias.forEach((cat, index) => {
      const btn = document.createElement("button");
      btn.className = "tab-button";
      if (index === 0) btn.classList.add("active");
      btn.dataset.categoria = cat;
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        cargarProductosDesdeFirebase(cat);
      });
      tabsContainer.appendChild(btn);
    });

    if (categorias.length > 0) {
      cargarProductosDesdeFirebase(categorias[0]);
    }
  }

  // ==========================
  // Render productos
  // ==========================
  function renderProductos(lista) {
    contenedor.innerHTML = "";
    lista.forEach((producto, index) => {
      const div = document.createElement("div");
      div.className = "producto";
      div.style.opacity = 0;
      div.style.transform = "translateY(20px)";
      div.innerHTML = `
        <img src="${cld(producto.imagen)}" alt="${producto.nombre}">
        <h3>${producto.nombre}</h3>
        <p>S/ ${producto.precio}</p>
        <button data-id="${producto.id}">Agregar al carrito</button>
      `;
      contenedor.appendChild(div);

      setTimeout(() => {
        div.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        div.style.opacity = 1;
        div.style.transform = "translateY(0)";
      }, index * 100);
    });
  }

  // ==========================
  // Render carrito
  // ==========================
  function renderCarrito() {
    carritoLista.innerHTML = "";
    let totalCompra = 0;
    carritoItems.forEach((item, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${item.nombre} - S/ ${item.precio}</span>
        <button class="btn-eliminar" data-index="${i}" aria-label="Eliminar ${item.nombre}">X</button>
      `;
      carritoLista.appendChild(li);
      totalCompra += parseFloat(item.precio) || 0;
    });
    total.textContent = totalCompra.toFixed(2);
    setContador(carritoItems.length, false);

    carritoLista.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", e => {
        const i = Number(e.currentTarget.dataset.index);
        carritoItems.splice(i, 1);
        guardarCarrito();
        renderCarrito();
      });
    });
  }

  // ==========================
  // Agregar al carrito
  // ==========================
  function agregarAlCarritoId(productId, botonParaAnimar = null) {
    const producto = productos.find(p => p.id === productId) || todosLosProductos.find(p => p.id === productId);
    if (!producto) return;
    carritoItems.push(producto);
    guardarCarrito();
    renderCarrito();
    setContador(carritoItems.length, true);
    if (botonParaAnimar) {
      botonParaAnimar.classList.add("agregado");
      setTimeout(() => botonParaAnimar.classList.remove("agregado"), 300);
    }
  }

  // ==========================
  // Eventos modal
  // ==========================
  cerrarModal.addEventListener("click", () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  window.addEventListener("click", e => {
    if (e.target === modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  modalAgregar.addEventListener("click", () => {
    if (productoActual) agregarAlCarritoId(productoActual.id);
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  contenedor.addEventListener("click", (e) => {
    const productoDiv = e.target.closest(".producto");
    if (!productoDiv) return;

    const id = productoDiv.querySelector("button[data-id]").dataset.id;
    const boton = e.target.closest("button[data-id]");

    if (boton) {
      agregarAlCarritoId(id, boton);
    } else {
      productoActual = productos.find(p => p.id === id) || todosLosProductos.find(p => p.id === id);
      if (!productoActual) return;

      modalImagen.src = cld(productoActual.imagen);
      modalNombre.textContent = productoActual.nombre;
      modalDescripcion.textContent = productoActual.descripcion || "Sin descripción disponible";
      modalPrecio.textContent = productoActual.precio;
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    }
  });

  // ==========================
  // Buscador (GLOBAL)
  // ==========================
  buscador.addEventListener("input", e => {
    const texto = e.target.value.trim().toLowerCase();
    if (!texto) {
      // Si el buscador está vacío, mostramos los productos de la categoría activa
      const categoriaActiva = document.querySelector(".tab-button.active")?.dataset.categoria;
      if (categoriaActiva) cargarProductosDesdeFirebase(categoriaActiva);
      return;
    }
    const filtrados = todosLosProductos.filter(p =>
      (p.nombre || "").toLowerCase().includes(texto) ||
      (p.descripcion || "").toLowerCase().includes(texto)
    );
    renderProductos(filtrados);
  });

  // ==========================
  // Finalizar compra
  // ==========================
  finalizarBtn?.addEventListener("click", () => {
    if (!carritoItems.length) return alert("Tu carrito está vacío.");

    const historial = JSON.parse(localStorage.getItem("historialCompras")) || [];
    const nuevaCompra = { fecha: new Date().toLocaleString(), items: [...carritoItems], total: total.textContent };
    historial.push(nuevaCompra);
    localStorage.setItem("historialCompras", JSON.stringify(historial));

    const productosTexto = carritoItems.map(item => `• ${item.nombre} - S/ ${item.precio}`).join('%0A');
    const mensaje = `Hola, quiero hacer mi compra con los siguientes productos:%0A${productosTexto}%0A%0ATotal: S/ ${total.textContent}`;
    const telefono = "51935462657";
    const urlWhatsApp = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    carritoItems = [];
    guardarCarrito();
    renderCarrito();
    carrito.classList.remove("activo");
    window.open(urlWhatsApp, "_blank");
  });

  // ==========================
  // Inicialización
  // ==========================
  cargarCategorias();
  renderCarrito();
});
