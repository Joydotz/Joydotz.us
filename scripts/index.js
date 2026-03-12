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

    // Social carousel navigation
    const socialTrack = document.querySelector(".social-track");
    const socialPrev = document.querySelector(".social-btn--prev");
    const socialNext = document.querySelector(".social-btn--next");

    if (socialTrack && socialPrev && socialNext) {
        const getSocialCardWidth = () => {
            const card = socialTrack.querySelector(".social-card");
            if (!card) return 0;
            const gap = parseInt(getComputedStyle(socialTrack).gap) || 12;
            return card.offsetWidth + gap;
        };

        socialPrev.addEventListener("click", () => {
            socialTrack.scrollTo({
                left: Math.max(socialTrack.scrollLeft - getSocialCardWidth(), 0),
                behavior: "smooth"
            });
        });

        socialNext.addEventListener("click", () => {
            socialTrack.scrollTo({
                left: Math.min(socialTrack.scrollLeft + getSocialCardWidth(), socialTrack.scrollWidth - socialTrack.clientWidth),
                behavior: "smooth"
            });
        });

        const updateSocialButtons = () => {
            const atStart = Math.round(socialTrack.scrollLeft) <= 0;
            socialPrev.style.opacity = atStart ? "0.3" : "1";
            socialPrev.style.pointerEvents = atStart ? "none" : "auto";
            const atEnd = Math.round(socialTrack.scrollLeft + socialTrack.clientWidth) >= socialTrack.scrollWidth;
            socialNext.style.opacity = atEnd ? "0.3" : "1";
            socialNext.style.pointerEvents = atEnd ? "none" : "auto";
        };

        socialTrack.addEventListener("scroll", updateSocialButtons);
        updateSocialButtons();
    }
});