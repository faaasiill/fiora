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
