// ==========================
// Importar Firestore
// ==========================
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // Elementos del DOM
  // ==========================
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

  // ==========================
  // Variables de estado
  // ==========================
  let carritoItems = JSON.parse(localStorage.getItem("carrito")) || [];
  let productos = [];
  let categorias = [];
  let productoActual = null;
  let todosLosProductos = [];
  let categoriaActiva = "Altavoces";

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
  const carruselNav = document.querySelector(".carrusel-nav");

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
    const numSlides = carruselSlides.length - 2;
    for (let i = 0; i < numSlides; i++) {
      const dot = document.createElement("button");
      dot.classList.add("carrusel-dot");
      dot.setAttribute("aria-label", `Ir a imagen ${i + 1}`);
      if (i === 0) dot.classList.add("active");
      dot.dataset.index = i + 1;
      carruselNav.appendChild(dot);
    }

    const dots = document.querySelectorAll(".carrusel-dot");

    const actualizarPosicion = () => {
      carruselTrack.style.transform = `translateX(-${indice * 100}%)`;
      dots.forEach(dot => dot.classList.remove("active"));
      
      let dotIndex = indice - 1;
      if (indice === 0) {
        dotIndex = dots.length - 1;
      } else if (indice === carruselSlides.length - 1) {
        dotIndex = 0;
      }
      
      if (dots[dotIndex]) {
        dots[dotIndex].classList.add("active");
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

    // 🔹 Para móviles: detener carrusel al tocar
    carruselTrack.addEventListener("touchstart", detenerCarrusel);
    carruselTrack.addEventListener("touchend", iniciarCarrusel);
  }

  // ==========================
  // UI Carrito
  // ==========================
  carritoFlotante.addEventListener("click", () => {
    carrito.classList.toggle("activo");
  });

  cerrarCarritoBtn.addEventListener("click", () => {
    carrito.classList.remove("activo");
  });

  // 🔹 Cerrar carrito al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!carrito.contains(e.target) && !carritoFlotante.contains(e.target)) {
      carrito.classList.remove("activo");
    }
  });

  // ==========================
  // Cargar productos desde Firebase
  // ==========================
  const productosRef = collection(window.db, "productos");

  async function cargarProductosDesdeFirebase(categoria = "Altavoces") {
    try {
      categoriaActiva = categoria;
      const q = query(productosRef, where("categoria", "==", categoria));
      const snapshot = await getDocs(q);
      productos = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        productos.push({ id: doc.id, ...data });
      });
      renderProductos(productos);
    } catch (error) {
      console.error("Error cargando productos desde Firebase:", error);
      mostrarMensajeError("Error al cargar productos. Por favor, recarga la página.");
    }
  }

  // ==========================
  // Cargar todas las categorías y productos
  // ==========================
  async function cargarCategorias() {
    try {
      const snapshot = await getDocs(productosRef);
      categorias = [];
      todosLosProductos = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        todosLosProductos.push({ id: doc.id, ...data });
        if (data.categoria && !categorias.includes(data.categoria)) {
          categorias.push(data.categoria);
        }
      });

      // Orden personalizado
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
      mostrarMensajeError("Error al cargar categorías. Por favor, recarga la página.");
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
        buscador.value = ""; // Limpiar buscador al cambiar categoría
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
    
    if (lista.length === 0) {
      contenedor.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No se encontraron productos.</p>';
      return;
    }

    lista.forEach((producto, index) => {
      const div = document.createElement("div");
      div.className = "producto";
      div.style.opacity = 0;
      div.style.transform = "translateY(20px)";
      
      const precioFormateado = parseFloat(producto.precio).toFixed(2);
      
      div.innerHTML = `
        <img src="${cld(producto.imagen, { w: 400, h: 400 })}" alt="${producto.nombre}" loading="lazy">
        <h3>${producto.nombre}</h3>
        <p class="precio">S/ ${precioFormateado}</p>
        <button data-id="${producto.id}" aria-label="Agregar ${producto.nombre} al carrito">Agregar al carrito</button>
      `;
      contenedor.appendChild(div);

      // Animación escalonada
      setTimeout(() => {
        div.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        div.style.opacity = 1;
        div.style.transform = "translateY(0)";
      }, index * 80);
    });
  }

  // ==========================
  // Render carrito
  // ==========================
  function renderCarrito() {
    carritoLista.innerHTML = "";
    let totalCompra = 0;

    if (carritoItems.length === 0) {
      carritoLista.innerHTML = '<li style="text-align: center; padding: 20px; color: #999;">Tu carrito está vacío</li>';
      total.textContent = "0.00";
      setContador(0, false);
      return;
    }

    carritoItems.forEach((item, i) => {
      const li = document.createElement("li");
      const precioFormateado = parseFloat(item.precio).toFixed(2);
      li.innerHTML = `
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">${item.nombre} - S/ ${precioFormateado}</span>
        <button class="btn-eliminar" data-index="${i}" aria-label="Eliminar ${item.nombre}">X</button>
      `;
      carritoLista.appendChild(li);
      totalCompra += parseFloat(item.precio) || 0;
    });

    total.textContent = totalCompra.toFixed(2);
    setContador(carritoItems.length, false);

    // Event listeners para botones eliminar
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
    if (!producto) {
      console.error("Producto no encontrado:", productId);
      return;
    }

    carritoItems.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen
    });

    guardarCarrito();
    renderCarrito();
    setContador(carritoItems.length, true);

    if (botonParaAnimar) {
      const textoOriginal = botonParaAnimar.textContent;
      botonParaAnimar.textContent = "✓ Agregado";
      botonParaAnimar.style.backgroundColor = "#4CAF50";
      setTimeout(() => {
        botonParaAnimar.textContent = textoOriginal;
        botonParaAnimar.style.backgroundColor = "";
      }, 1000);
    }
  }

  // ==========================
  // Eventos modal - SOLO SE CIERRA CON X
  // ==========================
  function cerrarModalProducto() {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    productoActual = null;
  }

  // ✅ Solo cerrar con el botón X
  cerrarModal.addEventListener("click", cerrarModalProducto);

  // ❌ ELIMINADO: Ya no se cierra al hacer clic fuera del modal
  // window.addEventListener("click", e => {
  //   if (e.target === modal) {
  //     cerrarModalProducto();
  //   }
  // });

  // 🔹 Cerrar modal con tecla ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.style.display === "block") {
      cerrarModalProducto();
    }
  });

  modalAgregar.addEventListener("click", () => {
    if (productoActual) {
      agregarAlCarritoId(productoActual.id, modalAgregar);
      
      // Esperar un momento antes de cerrar para que el usuario vea el mensaje
      setTimeout(() => {
        cerrarModalProducto();
      }, 1200);
    }
  });

  // ==========================
  // Click en productos
  // ==========================
  contenedor.addEventListener("click", (e) => {
    const productoDiv = e.target.closest(".producto");
    if (!productoDiv) return;

    const botonAgregar = productoDiv.querySelector("button[data-id]");
    if (!botonAgregar) return;

    const id = botonAgregar.dataset.id;
    const boton = e.target.closest("button[data-id]");

    // Si se hizo clic en el botón, agregar al carrito
    if (boton) {
      e.stopPropagation();
      agregarAlCarritoId(id, boton);
    } else {
      // Si se hizo clic en cualquier otra parte, abrir modal
      productoActual = productos.find(p => p.id === id) || todosLosProductos.find(p => p.id === id);
      if (!productoActual) return;

      modalImagen.src = cld(productoActual.imagen, { w: 500, h: 500 });
      modalImagen.alt = productoActual.nombre;
      modalNombre.textContent = productoActual.nombre;
      modalDescripcion.textContent = productoActual.descripcion || "Sin descripción disponible";
      modalPrecio.textContent = parseFloat(productoActual.precio).toFixed(2);
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    }
  });

  // ==========================
  // Buscador (GLOBAL)
  // ==========================
  let timeoutBusqueda;
  buscador.addEventListener("input", e => {
    clearTimeout(timeoutBusqueda);
    
    timeoutBusqueda = setTimeout(() => {
      const texto = e.target.value.trim().toLowerCase();
      
      if (!texto) {
        // Si el buscador está vacío, mostramos los productos de la categoría activa
        cargarProductosDesdeFirebase(categoriaActiva);
        return;
      }

      const filtrados = todosLosProductos.filter(p =>
        (p.nombre || "").toLowerCase().includes(texto) ||
        (p.descripcion || "").toLowerCase().includes(texto) ||
        (p.categoria || "").toLowerCase().includes(texto)
      );

      renderProductos(filtrados);
    }, 300); // Debounce de 300ms
  });

  // ==========================
  // Finalizar compra
  // ==========================
  finalizarBtn?.addEventListener("click", () => {
    if (!carritoItems.length) {
      alert("Tu carrito está vacío.");
      return;
    }

    // Guardar en historial
    const historial = JSON.parse(localStorage.getItem("historialCompras")) || [];
    const nuevaCompra = {
      fecha: new Date().toLocaleString("es-PE"),
      items: [...carritoItems],
      total: total.textContent
    };
    historial.push(nuevaCompra);
    localStorage.setItem("historialCompras", JSON.stringify(historial));

    // Crear mensaje para WhatsApp
    const productosTexto = carritoItems
      .map(item => `• ${item.nombre} - S/ ${parseFloat(item.precio).toFixed(2)}`)
      .join('%0A');
    
    const mensaje = `Hola, quiero hacer mi compra con los siguientes productos:%0A%0A${productosTexto}%0A%0A*Total: S/ ${total.textContent}*`;
    const telefono = "51935462657";
    const urlWhatsApp = `https://wa.me/${telefono}?text=${mensaje}`;

    // Limpiar carrito
    carritoItems = [];
    guardarCarrito();
    renderCarrito();
    carrito.classList.remove("activo");

    // Abrir WhatsApp
    window.open(urlWhatsApp, "_blank");
  });

  // ==========================
  // Función auxiliar para mostrar errores
  // ==========================
  function mostrarMensajeError(mensaje) {
    contenedor.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ff4d4d;">
        <p><strong>⚠ ${mensaje}</strong></p>
      </div>
    `;
  }

  // ==========================
  // Inicialización
  // ==========================
  cargarCategorias();
  renderCarrito();

  // 🔹 Log de inicio para debugging
  console.log("🎉 Tienda inicializada correctamente");
});

