document.addEventListener("DOMContentLoaded", () => {

  /**
   * ============================================================================
   * 1. Dynamic Date Display
   * Initializes and formats the current date and year for the UI using the 
   * localized Arabic format.
   * ============================================================================
   */
  const dateEl = document.getElementById("today-date");
  const yearEl = document.getElementById("year");

  if (dateEl) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dateEl.textContent = formatter.format(now);
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /**
   * ============================================================================
   * 2. Interactive Mood Selector (With Local Storage Persistence)
   * Handles mood chip selection, animates the central orb, updates the image, 
   * and saves the user's preference to localStorage to persist across reloads.
   * ============================================================================
   */
  const moodOrb = document.getElementById("mood-orb");
  const moodImage = document.getElementById("mood-image");
  const moodLabel = document.getElementById("mood-label");
  const chips = document.querySelectorAll(".mood-chip");
  const moodClasses = ['angry', 'sad', 'happy', 'tired', 'stressed', 'calm'];

  // Helper function to update the Mood UI and save state
  const updateMoodUI = (chip) => {
    // Reset active states
    chips.forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");

    // Extract values from dataset attributes
    const mood = chip.dataset.mood;
    const img = chip.dataset.image;
    const label = chip.dataset.label;

    // Update orb styling
    moodOrb.classList.remove(...moodClasses);
    moodOrb.classList.add(mood);

    // Apply animation and update image
    moodImage.src = img;
    moodImage.animate([
      { transform: "scale(0.8)", opacity: 0.5 },
      { transform: "scale(1)", opacity: 1 }
    ], { duration: 300, easing: "ease-out" });

    // Update text label
    moodLabel.textContent = label;

    // Persist the selection to local storage
    localStorage.setItem("anah_saved_mood", mood);
  };

  // Check if a mood was previously saved and restore it on page load
  const savedMood = localStorage.getItem("anah_saved_mood");
  if (savedMood) {
    const targetChip = Array.from(chips).find(c => c.dataset.mood === savedMood);
    if (targetChip) {
      updateMoodUI(targetChip);
    }
  }

  // Attach click event listeners to all mood chips
  chips.forEach((chip) => {
    chip.addEventListener("click", () => updateMoodUI(chip));
  });

  /**
   * ============================================================================
   * 3. Scroll Reveal Animations
   * Utilizes the Intersection Observer API to trigger CSS animations when 
   * designated elements enter the user's viewport.
   * ============================================================================
   */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // Stop observing once revealed
          }
        });
      },
      { threshold: 0.15 } // Trigger when 15% of the element is visible
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    // Fallback for legacy browsers without IntersectionObserver support
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /**
   * ============================================================================
   * 4. Smooth Anchor Scrolling
   * Enhances UX by smoothly scrolling to target sections when buttons with 
   * the [data-scroll] attribute are clicked.
   * ============================================================================
   */
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSelector = btn.dataset.scroll;
      const targetElement = document.querySelector(targetSelector);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

}); // END DOMContentLoaded

/**
 * ============================================================================
 * 5. Back-to-Top Navigation
 * Displays a button to scroll back to the top of the page after the user 
 * scrolls down past a predefined threshold (600px).
 * ============================================================================
 */
const backTop = document.getElementById("backTop");

if (backTop) {
  window.addEventListener("scroll", () => {
    // Toggle visibility based on scroll position
    backTop.classList.toggle("show", window.scrollY > 600);
  });

  backTop.addEventListener("click", () => {
    // Scroll smoothly to the top of the document
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}