/* ==========================================================================
   Trapo Sport Wear — Application Logic
   ========================================================================== */

(function () {
  "use strict";

  var CART_STORAGE_KEY = "trapo_cart_v1";

  var state = {
    basePath: "",
    activeCategory: "all",
    searchQuery: "",
    selectedSizes: {},
    lastFocusedBeforeDrawer: null
  };

  function getProducts() {
    return Array.isArray(window.TRAPO_PRODUCTS) ? window.TRAPO_PRODUCTS : [];
  }

  function resolvePath(relativePath) {
    if (!relativePath) return state.basePath;
    if (/^(https?:|mailto:|tel:|#)/i.test(relativePath)) {
      return relativePath;
    }
    var cleaned = relativePath.replace(/^\/+/, "");
    return state.basePath + cleaned;
  }

  function formatARS(amount) {
    var num = Number(amount) || 0;
    return "$" + num.toLocaleString("es-AR", { maximumFractionDigits: 0 });
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------------
     Cart Storage & Badges
     ------------------------------------------------------------------------ */

  function loadCart() {
    try {
      var raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var validIds = new Set(
        getProducts().map(function (p) {
          return p.id;
        })
      );
      return parsed.filter(function (item) {
        return (
          item &&
          typeof item.id === "string" &&
          validIds.has(item.id) &&
          typeof item.size === "string" &&
          Number(item.qty) > 0
        );
      });
    } catch (_err) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (_err) {
      // Ignore storage quota / private mode failures gracefully
    }
    syncCartBadges(cart);
  }

  function getCartCount(cart) {
    return cart.reduce(function (sum, item) {
      return sum + (Number(item.qty) || 0);
    }, 0);
  }

  function syncCartBadges(cartOverride) {
    var cart = cartOverride || loadCart();
    var total = getCartCount(cart);
    var badges = document.querySelectorAll("[data-cart-count]");
    badges.forEach(function (badge) {
      badge.textContent = String(total);
      badge.setAttribute(
        "aria-label",
        total === 1 ? "1 producto en el carrito" : total + " productos en el carrito"
      );
    });
  }

  function addToCart(productId, size) {
    var products = getProducts();
    var product = products.find(function (p) {
      return p.id === productId;
    });
    if (!product) return;

    var chosenSize = size || product.sizes[0];
    var cart = loadCart();
    var existing = cart.find(function (item) {
      return item.id === productId && item.size === chosenSize;
    });

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: productId, size: chosenSize, qty: 1 });
    }

    saveCart(cart);
    showToast(product.name + " (Talle " + chosenSize + ") agregado al carrito.");
  }

  /* ------------------------------------------------------------------------
     Toast Notifications
     ------------------------------------------------------------------------ */

  function getToastRegion() {
    var region = document.querySelector("[data-toast-region]");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("data-toast-region", "");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }
    return region;
  }

  function showToast(message) {
    var region = getToastRegion();
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    region.appendChild(toast);

    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  /* ------------------------------------------------------------------------
     Mobile Hamburger Drawer
     ------------------------------------------------------------------------ */

  function initMobileDrawer() {
    var toggle = document.querySelector(".menu-toggle");
    var drawer = document.getElementById("mobile-drawer");
    var backdrop = document.querySelector("[data-drawer-backdrop]");
    var closeBtn = drawer ? drawer.querySelector(".drawer-close") : null;

    if (!toggle || !drawer) return;

    function openDrawer() {
      state.lastFocusedBeforeDrawer = document.activeElement;
      drawer.hidden = false;
      if (backdrop) backdrop.hidden = false;

      window.requestAnimationFrame(function () {
        drawer.classList.add("is-open");
        if (backdrop) backdrop.classList.add("is-open");
      });

      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";

      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function closeDrawer(restoreFocus) {
      if (!drawer.classList.contains("is-open") && drawer.hidden) return;
      drawer.classList.remove("is-open");
      if (backdrop) backdrop.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";

      window.setTimeout(function () {
        if (!drawer.classList.contains("is-open")) {
          drawer.hidden = true;
          if (backdrop) backdrop.hidden = true;
        }
      }, 280);

      if (restoreFocus !== false && state.lastFocusedBeforeDrawer) {
        state.lastFocusedBeforeDrawer.focus();
      }
    }

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeDrawer(true);
      } else {
        openDrawer();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeDrawer(true);
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        closeDrawer(true);
      });
    }

    drawer.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (link) {
        closeDrawer(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !drawer.hidden) {
        closeDrawer(true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && !drawer.hidden) {
        closeDrawer(false);
      }
    });

    drawer._closeDrawer = closeDrawer;
  }

  /* ------------------------------------------------------------------------
     Search & Catalog Rendering
     ------------------------------------------------------------------------ */

  function syncSearchInputs(value) {
    var inputs = document.querySelectorAll('[data-search-form] input[type="search"], [data-search-form] input[name="q"]');
    inputs.forEach(function (input) {
      if (input.value !== value) {
        input.value = value;
      }
    });
  }

  function updateURLQuery(query) {
    try {
      var url = new URL(window.location.href);
      if (query) {
        url.searchParams.set("q", query);
      } else {
        url.searchParams.delete("q");
      }
      url.searchParams.delete("busqueda");
      window.history.replaceState({}, "", url.toString());
    } catch (_err) {
      // Ignore if running under restricted file:// history rules
    }
  }

  function renderCatalogStatus() {
    var statusEl = document.querySelector("[data-catalog-status]");
    if (!statusEl) return;

    if (!state.searchQuery) {
      statusEl.innerHTML = "";
      return;
    }

    statusEl.innerHTML =
      '<span>Mostrando resultados para "<strong>' +
      escapeHTML(state.searchQuery) +
      '</strong>"</span>' +
      '<button type="button" class="clear-search-btn" data-clear-search>Limpiar búsqueda</button>';

    var clearBtn = statusEl.querySelector("[data-clear-search]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.searchQuery = "";
        syncSearchInputs("");
        updateURLQuery("");
        renderCatalog();
      });
    }
  }

  function getFilteredProducts(baseCategory) {
    var products = getProducts();
    var category = baseCategory || "all";
    var queryNorm = normalizeText(state.searchQuery);

    return products.filter(function (product) {
      var matchesCategory = category === "all" || product.category === category;
      if (!matchesCategory) return false;
      if (!queryNorm) return true;

      var haystack = normalizeText(
        [
          product.name,
          product.categoryLabel,
          product.category,
          product.description,
          (product.tags || []).join(" ")
        ].join(" ")
      );
      return haystack.indexOf(queryNorm) !== -1;
    });
  }

  function renderCatalog() {
    var grid = document.querySelector("[data-product-grid]");
    if (!grid) return;

    renderCatalogStatus();

    var items = getFilteredProducts(state.activeCategory);

    if (items.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
        "<h3>No encontramos prendas con ese criterio</h3>" +
        "<p>Probá con otro término o restablecé el filtro de categoría.</p>" +
        "</div>";
      return;
    }

    grid.innerHTML = items
      .map(function (product) {
        var defaultSize =
          state.selectedSizes[product.id] ||
          (product.sizes.length > 1 ? product.sizes[1] : product.sizes[0]);
        state.selectedSizes[product.id] = defaultSize;

        var sizesMarkup = product.sizes
          .map(function (size) {
            var isSelected = size === defaultSize;
            return (
              '<button type="button" class="size-pill' +
              (isSelected ? " is-selected" : "") +
              '" data-size-btn data-product-id="' +
              escapeHTML(product.id) +
              '" data-size="' +
              escapeHTML(size) +
              '" aria-pressed="' +
              (isSelected ? "true" : "false") +
              '">' +
              escapeHTML(size) +
              "</button>"
            );
          })
          .join("");

        return (
          '<article class="product-card" data-product-id="' +
          escapeHTML(product.id) +
          '">' +
          '<div class="product-media">' +
          '<img src="' +
          escapeHTML(resolvePath(product.image)) +
          '" alt="' +
          escapeHTML(product.alt) +
          '" loading="lazy">' +
          "</div>" +
          '<div class="product-body">' +
          '<div class="product-meta">' +
          '<span class="product-category">' +
          escapeHTML(product.categoryLabel) +
          "</span>" +
          '<span class="product-price">' +
          escapeHTML(formatARS(product.price)) +
          "</span>" +
          "</div>" +
          '<h3 class="product-title">' +
          escapeHTML(product.name) +
          "</h3>" +
          '<p class="product-desc">' +
          escapeHTML(product.description) +
          "</p>" +
          '<div class="product-sizes" role="group" aria-label="Seleccionar talle para ' +
          escapeHTML(product.name) +
          '">' +
          sizesMarkup +
          "</div>" +
          '<button type="button" class="btn btn-primary product-add-btn" data-add-to-cart="' +
          escapeHTML(product.id) +
          '">Agregar al carrito</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function initCatalog() {
    var grid = document.querySelector("[data-product-grid]");
    if (!grid) return;

    state.activeCategory = grid.dataset.category || "all";

    var params = new URLSearchParams(window.location.search);
    var initialQuery = params.get("q") || params.get("busqueda") || "";
    if (initialQuery) {
      state.searchQuery = initialQuery.trim();
      syncSearchInputs(state.searchQuery);
    }

    var filterBar = document.querySelector("[data-filter-bar]");
    if (filterBar) {
      var tabs = filterBar.querySelectorAll("[data-filter]");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var chosen = tab.dataset.filter || "all";
          state.activeCategory = chosen;
          tabs.forEach(function (t) {
            var active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
          });
          renderCatalog();
        });
      });
    }

    grid.addEventListener("click", function (event) {
      var sizeBtn = event.target.closest("[data-size-btn]");
      if (sizeBtn) {
        var pid = sizeBtn.dataset.productId;
        var chosenSize = sizeBtn.dataset.size;
        state.selectedSizes[pid] = chosenSize;

        var group = sizeBtn.closest(".product-sizes");
        if (group) {
          group.querySelectorAll("[data-size-btn]").forEach(function (btn) {
            var selected = btn === sizeBtn;
            btn.classList.toggle("is-selected", selected);
            btn.setAttribute("aria-pressed", selected ? "true" : "false");
          });
        }
        return;
      }

      var addBtn = event.target.closest("[data-add-to-cart]");
      if (addBtn) {
        var productId = addBtn.dataset.addToCart;
        var selectedSize = state.selectedSizes[productId];
        addToCart(productId, selectedSize);
      }
    });

    renderCatalog();
  }

  function initSearchForms() {
    var forms = document.querySelectorAll("[data-search-form]");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = form.querySelector('input[type="search"], input[name="q"]');
        var query = input ? input.value.trim() : "";

        var grid = document.querySelector("[data-product-grid]");
        if (grid) {
          state.searchQuery = query;
          syncSearchInputs(query);
          updateURLQuery(query);
          renderCatalog();

          var drawer = document.getElementById("mobile-drawer");
          if (drawer && typeof drawer._closeDrawer === "function" && !drawer.hidden) {
            drawer._closeDrawer(false);
          }

          var targetSection = document.getElementById("productos") || grid;
          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          var dest = resolvePath("secciones/productos.html");
          window.location.href = query ? dest + "?q=" + encodeURIComponent(query) : dest;
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     Cart Page (secciones/carrito.html)
     ------------------------------------------------------------------------ */

  function renderCartPage(checkoutMessage) {
    var container = document.querySelector("[data-cart-container]");
    if (!container) return;

    var cart = loadCart();
    var products = getProducts();

    if (cart.length === 0) {
      var banner = checkoutMessage
        ? '<div class="form-feedback is-success" role="status">' + escapeHTML(checkoutMessage) + "</div>"
        : "";

      container.innerHTML =
        '<div class="cart-empty">' +
        banner +
        '<div class="cart-empty-icon" aria-hidden="true">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>' +
        "</svg>" +
        "</div>" +
        "<h2>Tu carrito está vacío</h2>" +
        "<p>Explorá nuestras líneas de entrenamiento y elegí tus prendas para sumarlas acá.</p>" +
        '<a class="btn btn-primary" href="' +
        escapeHTML(resolvePath("secciones/productos.html")) +
        '">Ver productos</a>' +
        "</div>";
      return;
    }

    var subtotal = 0;
    var totalUnits = 0;

    var rowsHTML = cart
      .map(function (item) {
        var product = products.find(function (p) {
          return p.id === item.id;
        });
        if (!product) return "";

        var lineTotal = product.price * item.qty;
        subtotal += lineTotal;
        totalUnits += item.qty;

        return (
          '<article class="cart-item" data-cart-id="' +
          escapeHTML(item.id) +
          '" data-cart-size="' +
          escapeHTML(item.size) +
          '">' +
          '<div class="cart-item-media">' +
          '<img src="' +
          escapeHTML(resolvePath(product.image)) +
          '" alt="' +
          escapeHTML(product.alt) +
          '">' +
          "</div>" +
          '<div class="cart-item-info">' +
          '<h2 class="cart-item-title">' +
          escapeHTML(product.name) +
          "</h2>" +
          '<p class="cart-item-meta">' +
          escapeHTML(product.categoryLabel) +
          " · Talle " +
          escapeHTML(item.size) +
          "</p>" +
          '<p class="cart-item-price">' +
          escapeHTML(formatARS(product.price)) +
          " c/u</p>" +
          "</div>" +
          '<div class="cart-item-actions">' +
          '<div class="qty-control" role="group" aria-label="Cantidad de ' +
          escapeHTML(product.name) +
          '">' +
          '<button type="button" class="qty-btn" data-qty-action="dec" aria-label="Disminuir cantidad">−</button>' +
          '<span class="qty-value">' +
          escapeHTML(item.qty) +
          "</span>" +
          '<button type="button" class="qty-btn" data-qty-action="inc" aria-label="Aumentar cantidad">+</button>' +
          "</div>" +
          '<span class="cart-item-subtotal">' +
          escapeHTML(formatARS(lineTotal)) +
          "</span>" +
          '<button type="button" class="cart-remove-btn" data-remove-item>Eliminar</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    container.innerHTML =
      '<div class="cart-layout">' +
      '<div class="cart-items">' +
      rowsHTML +
      "</div>" +
      '<aside class="cart-summary" aria-label="Resumen de compra">' +
      '<h2 class="cart-summary-title">Resumen</h2>' +
      '<div class="cart-summary-row"><span>Prendas (' +
      escapeHTML(totalUnits) +
      ')</span><span class="cart-summary-value">' +
      escapeHTML(formatARS(subtotal)) +
      "</span></div>" +
      '<div class="cart-summary-row"><span>Envío</span><span class="cart-summary-value">A coordinar</span></div>' +
      '<div class="cart-summary-row is-total"><span>Total estimado</span><span class="cart-summary-value">' +
      escapeHTML(formatARS(subtotal)) +
      "</span></div>" +
      '<div class="cart-summary-actions">' +
      '<button type="button" class="btn btn-primary btn-full" data-checkout-btn>Finalizar compra</button>' +
      '<button type="button" class="btn btn-secondary btn-full" data-clear-cart-btn>Vaciar carrito</button>' +
      "</div>" +
      "</aside>" +
      "</div>";
  }

  function initCartPage() {
    var container = document.querySelector("[data-cart-container]");
    if (!container) return;

    container.addEventListener("click", function (event) {
      var itemEl = event.target.closest(".cart-item");

      var qtyBtn = event.target.closest("[data-qty-action]");
      if (qtyBtn && itemEl) {
        var id = itemEl.dataset.cartId;
        var size = itemEl.dataset.cartSize;
        var action = qtyBtn.dataset.qtyAction;
        var cart = loadCart();
        var index = cart.findIndex(function (entry) {
          return entry.id === id && entry.size === size;
        });
        if (index === -1) return;

        if (action === "inc") {
          cart[index].qty += 1;
        } else if (action === "dec") {
          if (cart[index].qty > 1) {
            cart[index].qty -= 1;
          } else {
            cart.splice(index, 1);
            showToast("Producto quitado del carrito.");
          }
        }
        saveCart(cart);
        renderCartPage();
        return;
      }

      var removeBtn = event.target.closest("[data-remove-item]");
      if (removeBtn && itemEl) {
        var removeId = itemEl.dataset.cartId;
        var removeSize = itemEl.dataset.cartSize;
        var updated = loadCart().filter(function (entry) {
          return !(entry.id === removeId && entry.size === removeSize);
        });
        saveCart(updated);
        showToast("Producto eliminado del carrito.");
        renderCartPage();
        return;
      }

      if (event.target.closest("[data-clear-cart-btn]")) {
        saveCart([]);
        showToast("Carrito vaciado.");
        renderCartPage();
        return;
      }

      if (event.target.closest("[data-checkout-btn]")) {
        var currentCart = loadCart();
        var units = getCartCount(currentCart);
        saveCart([]);
        showToast("Pedido registrado en modo demostración.");
        renderCartPage(
          "¡Pedido confirmado en modo demostración! Registramos " +
            units +
            (units === 1 ? " prenda" : " prendas") +
            " para tu compra en Trapo Sport Wear."
        );
      }
    });

    renderCartPage();
  }

  /* ------------------------------------------------------------------------
     Contact Form Validation
     ------------------------------------------------------------------------ */

  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var feedback = form.querySelector("[data-contact-feedback]");

    function clearFieldErrors() {
      form.querySelectorAll(".field-error").forEach(function (el) {
        el.remove();
      });
      form.querySelectorAll(".is-invalid").forEach(function (el) {
        el.classList.remove("is-invalid");
        el.removeAttribute("aria-invalid");
      });
    }

    function setFieldError(input, msg) {
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      var err = document.createElement("span");
      err.className = "field-error";
      err.textContent = msg;
      input.insertAdjacentElement("afterend", err);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFieldErrors();

      var nameInput = form.querySelector('[name="nombre"]');
      var emailInput = form.querySelector('[name="email"]');
      var msgInput = form.querySelector('[name="mensaje"]');

      var firstInvalid = null;

      if (nameInput && nameInput.value.trim().length < 2) {
        setFieldError(nameInput, "Ingresá tu nombre (mínimo 2 caracteres).");
        firstInvalid = firstInvalid || nameInput;
      }

      var emailVal = emailInput ? emailInput.value.trim() : "";
      if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        setFieldError(emailInput, "Ingresá un correo electrónico válido.");
        firstInvalid = firstInvalid || emailInput;
      }

      if (msgInput && msgInput.value.trim().length < 8) {
        setFieldError(msgInput, "Contanos tu consulta (mínimo 8 caracteres).");
        firstInvalid = firstInvalid || msgInput;
      }

      if (firstInvalid) {
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "form-feedback is-error";
          feedback.textContent = "Revisá los campos marcados antes de enviar.";
        }
        firstInvalid.focus();
        return;
      }

      if (feedback) {
        feedback.hidden = false;
        feedback.className = "form-feedback is-success";
        feedback.textContent =
          "¡Consulta recibida! Gracias por escribirle a Trapo Sport Wear, te responderemos a la brevedad.";
      }
      form.reset();
    });
  }

  /* ------------------------------------------------------------------------
     Password Visibility Toggle (login.html & register.html)
     ------------------------------------------------------------------------ */

  function initPasswordToggles() {
    var toggles = document.querySelectorAll("[data-password-toggle]");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("data-password-toggle");
        var input = document.getElementById(targetId);
        if (!input) return;

        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.setAttribute("aria-pressed", showing ? "false" : "true");
        btn.setAttribute("aria-label", showing ? "Mostrar contraseña" : "Ocultar contraseña");
      });
    });
  }

  /* ------------------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    state.basePath = document.body.dataset.basePath || "";

    syncCartBadges();
    initMobileDrawer();
    initSearchForms();
    initCatalog();
    initCartPage();
    initContactForm();
    initPasswordToggles();

    window.addEventListener("storage", function (event) {
      if (event.key === CART_STORAGE_KEY) {
        syncCartBadges();
        if (document.querySelector("[data-cart-container]")) {
          renderCartPage();
        }
      }
    });
  });
})();
