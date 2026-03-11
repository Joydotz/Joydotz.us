document.addEventListener("DOMContentLoaded", () => {
    const learnMoreBtn = document.getElementById("learn-more-btn");
    
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener("click", () => {
            const productGrid = document.querySelector(".product-grid");
            if (productGrid) {
                productGrid.scrollIntoView({ behavior: "smooth" });
            }
        });
    }
});