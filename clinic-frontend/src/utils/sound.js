const sounds = {
  success: new Audio("/sounds/success.mp3"),
  appointment: new Audio("/sounds/appointment.mp3"),
  notification: new Audio("/sounds/notification.mp3"),
};

sounds.success.volume = 0.65;
sounds.appointment.volume = 0.65;
sounds.notification.volume = 0.45;

export const playSound = (type = "success") => {

  const sound = sounds[type];

  if (!sound) return;

  sound.currentTime = 0;

  sound.play().catch(() => {});

  document.body.classList.add("success-flash");

  setTimeout(() => {
    document.body.classList.remove("success-flash");
  }, 450);

};