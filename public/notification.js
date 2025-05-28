const socket = io(); // Connect to your Socket.IO server

function showNotification(title, message, type = 'info') {
  const colors = {
    error: '#ff4d4f',
    emergency: '#ff7875',
    alert: '#faad14',
    message: '#1890ff',
    info: '#91d5ff',
    success: '#52c41a',
  };

  const bgColor = colors[type] || colors.info;

  const container = document.getElementById('notification-container') || (() => {
    const c = document.createElement('div');
    c.id = 'notification-container';
    c.style.position = 'fixed';
    c.style.top = '10px';
    c.style.right = '10px';
    c.style.zIndex = 9999;
    document.body.appendChild(c);
    return c;
  })();

  const notification = document.createElement('div');
  notification.style.background = bgColor;
  notification.style.color = '#fff';
  notification.style.padding = '12px 18px';
  notification.style.marginTop = '10px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  notification.style.transition = 'all 0.3s ease';
  notification.innerHTML = `<strong>${title}</strong><br>${message}`;

  container.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = 0;
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// Handle both mqttError events
socket.on('mqttError', (data) => {
  showNotification(`MQTT Error: ${data.type}`, data.message, 'error');
});

socket.on('mqtt_error', (data) => {
  showNotification(`MQTT Error: ${data.type}`, data.message, 'error');
});

// Handle MQTT messages (emergency, alert, message)
socket.on('message', (data) => {
  const type = data.type.toLowerCase();
  showNotification(`${data.type} from ${data.from}`, data.data, type);
});

// Handle general notifications
socket.on('notification', (data) => {
  console.log(data)
  if (data.type === 'silo_status') {
    const statusColor = data.data === 'connected' ? 'success' : 'error';
    showNotification(`Silo ${data.from} status`, data.data, statusColor);
  } else if (data.type === 'mqttStatus') {
    const mqttColor = ['connected', 'reconnect'].includes(data.data)
      ? 'success'
      : data.data === 'connecting'
      ? 'info'
      : 'error';
    showNotification('MQTT Status', data.data, mqttColor);
  } else if (data.type === 'subscription') {
    showNotification('Subscription Success', `Subscribed to ${data.data}`, 'success');
  } else if (data.type === 'unsubscription') {
    showNotification('Unsubscribed', `Unsubscribed from ${data.data}`, 'alert');
  } else if (data.type === 'refVal'){
    if(data.data?.temperature) showNotification(`Reference temperature for silo ${data.from}`, `${data.data.temperature}°C`, 'info');
    if(data.data?.humidity) showNotification(`Reference humidity for silo ${data.from}`, `${data.data.humidity}%`, 'info');
    if(data.data?.co2) showNotification(`Reference co2 for silo ${data.from}`, `${data.data.co2}ppm`, 'info');
  } else {
    showNotification(`Notification: ${data.type}`, `${data.from || ''} - ${data.data}`, 'info');
  }

});
