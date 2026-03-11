document.addEventListener("DOMContentLoaded", () => {
    const learnMoreBtn = document.getElementById("learn-more-btn");

    if (learnMoreBtn) {
        learnMoreBtn.addEventListener("click", () => {
            const carouselSection = document.querySelector(".carousel-section");
            if (carouselSection) {
                carouselSection.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    // Carousel navigation
    const track = document.querySelector(".product-grid");
    const prevBtn = document.querySelector(".carousel-btn--prev");
    const nextBtn = document.querySelector(".carousel-btn--next");

    if (track && prevBtn && nextBtn) {
        const getCardWidth = () => {
            const card = track.querySelector(".product-card");
            if (!card) return 0;
            const gap = parseInt(getComputedStyle(track).gap) || 20;
            return card.offsetWidth + gap;
        };

        prevBtn.addEventListener("click", () => {
            track.scrollTo({
                left: Math.max(track.scrollLeft - getCardWidth(), 0),
                behavior: "smooth"
            });
        });

        nextBtn.addEventListener("click", () => {
            track.scrollTo({
                left: Math.min(track.scrollLeft + getCardWidth(), track.scrollWidth - track.clientWidth),
                behavior: "smooth"
            });
        });

        // Show/hide buttons based on scroll position
        const updateButtons = () => {
            const atStart = Math.round(track.scrollLeft) <= 0;
            prevBtn.style.opacity = atStart ? "0.3" : "1";
            prevBtn.style.pointerEvents = atStart ? "none" : "auto";
            const atEnd = Math.round(track.scrollLeft + track.clientWidth) >= track.scrollWidth;
            nextBtn.style.opacity = atEnd ? "0.3" : "1";
            nextBtn.style.pointerEvents = atEnd ? "none" : "auto";
        };

        track.addEventListener("scroll", updateButtons);
        updateButtons();
    }
});