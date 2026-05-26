let soundCache = null;

const getSounds = () => {
  if (typeof window === "undefined" || !window.Audio) return {};
  if (!soundCache) {
    soundCache = {
      success: new Audio("/sounds/success.mp3"),
      transaction: new Audio("/sounds/transaction.mp3"),
      notification: new Audio("/sounds/notification.mp3"),
    };
    soundCache.success.volume = 0.65;
    soundCache.transaction.volume = 0.65;
    soundCache.notification.volume = 0.45;
  }
  return soundCache;
};

export const playSound = (type = "success") => {
  const cache = getSounds();
  const sound = cache[type];

  if (!sound) return;

  sound.pause();
  sound.currentTime = 0;

  sound.play().catch((err) => {
    console.log(`Sound play blocked for ${type}:`, err);
  });

  document.body.classList.add("success-flash");

  setTimeout(() => {
    document.body.classList.remove("success-flash");
  }, 450);
};