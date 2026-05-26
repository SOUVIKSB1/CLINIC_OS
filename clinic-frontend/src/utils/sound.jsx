import { useEffect } from "react";

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

export default function NotificationButton({
  item,
  handleDismiss,
  setPage,
}) {
  useEffect(() => {
    playSound("notification");
  }, []);

  return (
    <>
      {item.type === "billing" && (
        <button
          onClick={() => {
            playSound("transaction");
            handleDismiss(item.id);
            setPage("bills");
          }}
          style={{
            minHeight: "30px",
            padding: "4px 10px",
            fontSize: "11px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: "600",
          }}
        >
          Pay Bill
        </button>
      )}

      {item.type === "appointment" && (
        <button
          onClick={() => {
            playSound("success");
            handleDismiss(item.id);
            setPage("appointments");
          }}
          style={{
            minHeight: "30px",
            padding: "4px 10px",
            fontSize: "11px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: "#16a34a",
            color: "#fff",
            fontWeight: "600",
          }}
        >
          View Appointment
        </button>
      )}
    </>
  );
}