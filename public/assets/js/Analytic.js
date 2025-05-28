document.addEventListener("DOMContentLoaded", () => {
 
  const analyticsCharts = {
    temp: createChart("tempChart", "Temperature (°C)", "#FF6384"),
    humidity: createChart("humidityChart", "Humidity (%)", "#36A2EB"),
    level: createChart("levelChart", "Level (%)", "#4BC0C0"),
    co2: createChart("co2Chart", "CO2 (%)", "#FFCE56")
  };

 
  const existing = localStorage.getItem('silo1LiveData');
  if (existing) {
    const { data } = JSON.parse(existing);
    updateCharts(data);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "silo1LiveData") {
      const { data } = JSON.parse(event.newValue);
      updateCharts(data);
    }
  });

 
  function createChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          label: label,
          borderColor: color,
          backgroundColor: "transparent",
          data: [],
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  
  function updateCharts(data) {
    const time = new Date().toLocaleTimeString();

    Object.entries(analyticsCharts).forEach(([key, chart]) => {
      chart.data.labels.push(time);
      chart.data.datasets[0].data.push(data[key]);

      if (chart.data.labels.length > 15) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }

      chart.update();
    });
  }
});
