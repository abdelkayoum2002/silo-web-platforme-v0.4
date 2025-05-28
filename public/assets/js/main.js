class NavigationManager {
  constructor() {
    this.navItems = document.querySelectorAll(".navigation li");
    this.initNavigation();
    this.initActiveLinks();
  }

  initNavigation() {
    const toggle = document.querySelector('.toggle');
    if (!toggle) return;

    const navigation = document.querySelector('.navigation');
    const main = document.querySelector('.main');

    toggle.addEventListener('click', () => {
      navigation.classList.toggle('active');
      main.classList.toggle('active');
    });
  }

  initActiveLinks() {
    this.navItems.forEach(item => {
      item.addEventListener('mouseover', () => {
        this.navItems.forEach(i => i.classList.remove('hovered'));
        item.classList.add('hovered');
      });
    });
  }
}

// Initialize when DOM is loaded
if (document.querySelector('.navigation')) {
  document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
  });
}


document.addEventListener('DOMContentLoaded', function() {
    const silos = ['silo1', 'silo2', 'silo3', 'silo4'];
    const charts = {};
    let analyticsCharts = {};

    
    function updateCards(siloId, data) {
        document.getElementById(`${siloId}Temp`).textContent = data.temp.toFixed(1);
        document.getElementById(`${siloId}Humidity`).textContent = data.humidity.toFixed(1);
        document.getElementById(`${siloId}Level`).textContent = data.level.toFixed(1);
        document.getElementById(`${siloId}CO2`).textContent = data.co2.toFixed(2);
    }

   
    function initMainCharts() {
        silos.forEach(siloId => {
            const ctx = document.getElementById(`${siloId}CombinedChart`).getContext('2d');
            charts[siloId] = new Chart(ctx, {
                type: 'line',
       data: {
        labels: [],
        datasets: [
          { label: 'Temperature', borderColor: '#FF6384', data: [] },
          { label: 'Humidity', borderColor: '#36A2EB', data: [] },
          { label: 'Level', borderColor: '#4BC0C0', data: [] },
          { label: 'CO2', borderColor: '#FFCE56', data: [] }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  });
  }

  
    function initAnalyticsCharts() {
        if(!window.location.pathname.includes('analytique')) return;

        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        };

        analyticsCharts = {
            temp: new Chart(document.getElementById('tempChart'), {
                ...chartConfig,
                data: createChartData('#FF6384', 'Temperature')
            }),
            humidity: new Chart(document.getElementById('humidityChart'), {
                ...chartConfig,
                data: createChartData('#36A2EB', 'Humidity')
            }),
            level: new Chart(document.getElementById('levelChart'), {
                ...chartConfig,
                data: createChartData('#4BC0C0', 'Level')
            }),
            co2: new Chart(document.getElementById('co2Chart'), {
                ...chartConfig,
                data: createChartData('#FFCE56', 'CO2')
            })
        };
    }

    function createChartData(color, label) {
        return {
            labels: [],
            datasets: [{
                label: label,
                borderColor: color,
                data: [],
                tension: 0.3
            }]
        };
    }

   
    setInterval(() => {
        silos.forEach(siloId => {
            const data = generateRandomData();
            
            
            updateCards(siloId, data);
            updateMainChart(siloId, data);
            
            
            if(window.location.pathname.includes('analytique') && siloId === 'silo1') {
                updateAnalyticsCharts(data);
            }
            
            
            localStorage.setItem('silo1LiveData', JSON.stringify({
                timestamp: new Date().getTime(),
                data: data
            }));
        });
    }, 2000);

    function generateRandomData() {
        return {
            temp: Math.random() * 40 + 10,
            humidity: Math.random() * 100,
            level: Math.random() * 100,
            co2: Math.random() * 5
        };
    }

    function updateMainChart(siloId, data) {
        const chart = charts[siloId];
        const time = new Date().toLocaleTimeString();
        
        chart.data.labels.push(time);
        chart.data.datasets.forEach((dataset, index) => {
            dataset.data.push(Object.values(data)[index]);
        });

        if(chart.data.labels.length > 15) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(d => d.data.shift());
        }

        chart.update();
    }

    function updateAnalyticsCharts(data) {
        const time = new Date().toLocaleTimeString();
        
        Object.keys(analyticsCharts).forEach(key => {
            const chart = analyticsCharts[key];
            
            chart.data.labels.push(time);
            chart.data.datasets[0].data.push(data[key]);
            
            if(chart.data.labels.length > 15) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            chart.update();
        });
    }

    initMainCharts();
    initAnalyticsCharts();

    
    window.addEventListener('storage', (event) => {
        if(event.key === 'silo1LiveData') {
            const { data } = JSON.parse(event.newValue);
            updateAnalyticsCharts(data);
        }
    });
});
