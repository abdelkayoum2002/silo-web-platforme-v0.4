class Notification {
  constructor() {
    this.notification = document.createElement('div');
    this.notification.id = 'notification';
    this.notification.className = 'hidden';
    document.body.appendChild(this.notification);
  }

  show(message, type = 'success', duration = 3000) {
    this.notification.textContent = message;
    this.notification.className = type;
    
    setTimeout(() => {
      this.notification.classList.add('fade-out');
      setTimeout(() => {
        this.notification.className = 'hidden';
      }, 500);
    }, duration);
  }
}

window.Notification = new Notification();