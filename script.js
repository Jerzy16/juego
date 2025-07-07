// Puedes agregar animaciones o interactividad aquí si lo deseas 

document.addEventListener('DOMContentLoaded', function() {
  const productoLink = document.getElementById('producto-link');
  const productoContainer = document.getElementById('producto-container');

  if (productoLink && productoContainer) {
    productoLink.addEventListener('click', function(e) {
      e.preventDefault();
      fetch('producto/producto.html')
        .then(response => response.text())
        .then(html => {
          // Extraer solo el contenido relevante del producto (main)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const mainContent = tempDiv.querySelector('main');
          if (mainContent) {
            productoContainer.innerHTML = '';
            productoContainer.appendChild(mainContent);
          } else {
            productoContainer.innerHTML = '<p>No se pudo cargar el producto.</p>';
          }
        })
        .catch(() => {
          productoContainer.innerHTML = '<p>Error al cargar el producto.</p>';
        });
    });
  }
}); 