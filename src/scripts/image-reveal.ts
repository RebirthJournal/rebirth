// Server-rendered images stay visible if JavaScript is unavailable.
const initialized = new WeakSet<HTMLElement>();

function initializeImages() {
  document.querySelectorAll<HTMLElement>("[data-image-reveal]").forEach((frame) => {
    if (initialized.has(frame)) return;
    const image = frame.querySelector("img");
    if (!image) return;
    initialized.add(frame);

    frame.classList.add("is-resetting");
    frame.classList.remove("is-revealed");
    frame.dataset.state = "loading";
    void frame.offsetWidth;
    frame.classList.remove("is-resetting");

    const reveal = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", reveal);
      // A failed image also leaves the loading state, exposing its alt text.
      frame.dataset.state = image.naturalWidth > 0 ? "loaded" : "error";
      requestAnimationFrame(() => {
        if (frame.isConnected) frame.classList.add("is-revealed");
      });
    };
    const loaded = () => {
      void image
        .decode()
        .catch(() => {})
        .then(reveal);
    };
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", reveal, { once: true });
    if (image.complete) loaded();
  });
}

initializeImages();
document.addEventListener("astro:after-swap", initializeImages);
document.addEventListener("astro:page-load", initializeImages);
