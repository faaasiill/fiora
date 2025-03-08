const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('show');
});

// Array of texts to change every 5 seconds
const texts = [
  "Your Destination for Stylish Women's Bags!",
  "Explore Our Exclusive Collection!",
  "Trendy Bags for Every Occasion!",
  "Find Your Perfect Bag Today!"
];

// Function to change the text inside the h1 element
let index = 0;
const textElement = document.querySelector('.first-text');

function changeText() {
  textElement.style.opacity = 0; // Fade out the text for smooth transition
  textElement.style.transform = "scale(0.8)"; // Start scaled down
  textElement.style.filter = "blur(10px)"; // Apply the blur effect

  // Wait for the transition before changing text
  setTimeout(() => {
    textElement.textContent = texts[index]; // Change the content
    textElement.style.opacity = 1; // Fade the new text in
    textElement.style.transform = "scale(1)"; // Reset scaling to normal
    textElement.style.filter = "blur(0)"; // Remove the blur effect

    // Re-trigger the animation by removing and adding the class
    textElement.classList.remove('first-text');
    void textElement.offsetWidth; // Trigger reflow to restart animation
    textElement.classList.add('first-text');
  }, 500); // Wait 0.5s before changing the text to ensure smooth fading out

  // Move to the next text or loop back
  index = (index + 1) % texts.length;
}

// Change text every 5 seconds
setInterval(changeText, 5000);

// Initial text load
changeText();


// 


let currentIndex = 0;
let itemsPerSlide = 4; // Default number of items per slide
const slider = document.querySelector('.best-sellers-grid');
const totalItems = document.querySelectorAll('.product-card').length;

// Function to update the slider position
function moveSlider() {
  const offset = -currentIndex * (document.querySelector('.product-card').offsetWidth + 20); // 20px for margin
  slider.style.transform = `translateX(${offset}px)`;
}

// Left arrow click event
document.querySelector('.left-arrow').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = totalItems - itemsPerSlide;
  }
  moveSlider();
});

// Right arrow click event
document.querySelector('.right-arrow').addEventListener('click', () => {
  if (currentIndex < totalItems - itemsPerSlide) {
    currentIndex++;
  } else {
    currentIndex = 0;
  }
  moveSlider();
});

// Adjust the items per slide on resize
function adjustItemsPerSlide() {
  if (window.innerWidth <= 480) {
    itemsPerSlide = 1; // 1 item per slide on mobile
  } else if (window.innerWidth <= 768) {
    itemsPerSlide = 2; // 2 items per slide on tablets
  } else {
    itemsPerSlide = 4; // 4 items per slide on desktop
  }
}

window.addEventListener('resize', adjustItemsPerSlide);
adjustItemsPerSlide(); // Adjust on initial load

// Auto-scroll functionality
function autoScroll() {
  if (currentIndex < totalItems - itemsPerSlide) {
    currentIndex++;
  } else {
    currentIndex = 0;
  }
  moveSlider();
}

// Set auto-scroll every 3 seconds
setInterval(autoScroll, 3000); 

document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.querySelector('.dropdown');
  const dropdownLink = dropdown.querySelector('.sign-in-link');
  const currentTimeElement = document.getElementById('current-time');

  // Function to update the current time dynamically
  function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeString = `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
    currentTimeElement.textContent = `Current time: ${timeString}`;
  }

  // Update time every minute
  setInterval(updateTime, 60000); // 60,000 ms = 1 minute
  updateTime(); // Set the initial time on page load

  // Handle click event to toggle dropdown visibility
  dropdownLink.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default behavior of the <a> tag
    dropdown.classList.toggle('active'); // Toggle the 'active' class to show/hide the dropdown
  });

  // Close the dropdown if clicked outside of it
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('active'); // Hide the dropdown if clicked outside
    }
  });
});


const WishlistState = {
    isProcessing: false
};

const UIUtil = {
    showLoginPrompt: () => {
        Swal.fire({
            title: "Please Login",
            text: "You need to login first to add items to wishlist",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Login",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "/login";
            }
        });
    },

    showNotification: (title, message, icon) => {
        Swal.fire({
            title: title,
            text: message,
            icon: icon,
            timer: 2000,
            showConfirmButton: false
        });
    }
};

const WishlistManager = {
    initialize: function() {
        this.checkInitialState();
        // Add event delegation for wishlist buttons
        document.addEventListener('DOMContentLoaded', () => {
            const productGrid = document.querySelector('.best-sellers-grid');
            if (productGrid) {
                productGrid.addEventListener('click', (e) => {
                    const wishlistBtn = e.target.closest('.wishlist-btn');
                    if (wishlistBtn) {
                        e.preventDefault();
                        const productId = wishlistBtn.dataset.productId;
                        this.toggleWishlist(e, productId, wishlistBtn);
                    }
                });
            }
        });
    },

    toggleWishlistButton: (button) => {
        const icon = button.querySelector('.wishlist-icon');
        button.classList.toggle('active');
        icon.style.color = button.classList.contains('active') ? '#ff4444' : '#333';
    },

    checkInitialState: async function() {
        try {
            const response = await fetch('/getWishlistedProducts', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to check wishlist state');
            const wishlistedProducts = await response.json();
            
            document.querySelectorAll('.wishlist-btn').forEach(btn => {
                const productId = btn.dataset.productId;
                if (wishlistedProducts.includes(productId)) {
                    this.toggleWishlistButton(btn);
                }
            });
        } catch (error) {
            console.error('Wishlist check error:', error);
        }
    },

    toggleWishlist: async function(event, productId, button) {
        event.preventDefault();
        if (WishlistState.isProcessing || !productId) return;
        WishlistState.isProcessing = true;

        try {
            const isRemoving = button.classList.contains('active');
            
            if (isRemoving) {
                const confirmation = await Swal.fire({
                    title: 'Remove from Wishlist?',
                    text: 'Are you sure you want to remove this item?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, remove it!'
                });

                if (!confirmation.isConfirmed) {
                    WishlistState.isProcessing = false;
                    return;
                }
            }

            const endpoint = isRemoving ? '/removeFromWishlist' : '/addToWishlist';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ productId })
            });

            if (response.status === 401) {
                UIUtil.showLoginPrompt();
                return;
            }

            if (!response.ok) throw new Error('Server error');
            const data = await response.json();

            if (data.status) {
                this.toggleWishlistButton(button);
                UIUtil.showNotification(
                    'Success', 
                    isRemoving ? 'Removed from wishlist' : 'Added to wishlist', 
                    'success'
                );
            }
        } catch (error) {
            console.error('Wishlist operation error:', error);
            UIUtil.showNotification('Error', 'Operation failed', 'error');
        } finally {
            WishlistState.isProcessing = false;
        }
    }
};

// Initialize wishlist functionality
WishlistManager.initialize();

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  const searchContent = document.getElementById('searchContent');
  
  let debounceTimer;

  searchInput.addEventListener('input', async (e) => {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const query = e.target.value.trim();
      
      if (query.length >= 2) {
        try {
          const response = await fetch(`/search-products?q=${encodeURIComponent(query)}`);
          const products = await response.json();
          
          if (products.length > 0) {
            searchContent.innerHTML = `
            <a class="viewAlltag" href="/products">View All</a>
              <div class="product-slider">
                <button class="nav-arrow prev-arrow">
                  <span class="material-symbols-outlined">arrow_back_ios</span>
                </button>
                <div class="product-grid">
                  ${products.map(product => `
                    <div class="product-item">
                      <div style="position: relative;">
                        <a href="/productDetails?id=${product._id}">
                          <img src="${product.productImage[0]}" alt="${product.productName}" class="product-img">
                        </a>
                        <button class="favorite-btn" data-product-id="${product._id}"
                          onclick="WishlistManager.toggleWishlist(event, '${product._id}', this)">
                          
                        </button>
                      </div>
                      <h3 class="product-title">${product.productName}</h3>
                      <p class="product-cost">
                        ₹${product.salePrice}
                        ${product.regularPrice ? `<span class="previous-price">₹${product.regularPrice}</span>` : ''}
                      </p>
                    </div>
                  `).join('')}
                </div>
                <button class="nav-arrow next-arrow">
                  <span class="material-symbols-outlined">arrow_forward_ios</span>
                </button>
              </div>
            `;
            searchDropdown.classList.add('active');
            
            const grid = searchContent.querySelector('.product-grid');
            const prevArrow = searchContent.querySelector('.prev-arrow');
            const nextArrow = searchContent.querySelector('.next-arrow');
            
            prevArrow.addEventListener('click', () => {
              grid.scrollBy({ left: -200, behavior: 'smooth' });
            });
            
            nextArrow.addEventListener('click', () => {
              grid.scrollBy({ left: 200, behavior: 'smooth' });
            });
          } else {
            searchContent.innerHTML = '<p>No products found</p>';
            searchDropdown.classList.add('active');
          }
        } catch (error) {
          console.error('Search error:', error);
          searchContent.innerHTML = '<p>Error loading results</p>';
          searchDropdown.classList.add('active');
        }
      } else {
        searchDropdown.classList.remove('active');
        searchContent.innerHTML = '';
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.classList.remove('active');
      searchContent.innerHTML = '';
    }
  });

  searchDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
});