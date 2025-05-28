
class Dashboard {
  constructor() {
    if (document.querySelector('.silo-box')) {
      this.initSilos();
    }
    this.showWelcomeMessage();
  }

  initSilos() {
    document.querySelectorAll('.silo-box').forEach(box => {
      box.addEventListener('click', (e) => {
        e.preventDefault();
        const siloId = box.querySelector('h3').textContent;
        this.showNotification(`Opening ${siloId}...`);
        setTimeout(() => {
          window.location.href = box.getAttribute('href');
        }, 1000);
      });
    });
  }

  showWelcomeMessage() {
    const username = localStorage.getItem('username') || 'User';
    this.showNotification(`Welcome, ${username}!`);
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize only on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
  });
}