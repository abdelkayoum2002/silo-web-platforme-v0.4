class DataService {
  static getSiloData(siloId) {
    return {
      temperature: `${Math.floor(20 + Math.random() * 10)}°C`,
      humidity: `${Math.floor(40 + Math.random() * 20)}%`,
      level: `${Math.floor(50 + Math.random() * 50)}%`,
      co2: `${(0.8 + Math.random() * 0.7).toFixed(1)}%`,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  static updateSiloData(siloElement) {
    const data = this.getSiloData(siloElement.id);
    const numbers = siloElement.querySelectorAll('.numbers');
    
    if (numbers.length >= 4) {
      numbers[0].textContent = data.temperature;
      numbers[1].textContent = data.humidity;
      numbers[2].textContent = data.level;
      numbers[3].textContent = data.co2;
    }
  }
}

// Make it globally available
window.DataService = DataService;