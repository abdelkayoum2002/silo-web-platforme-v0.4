const { MqttClient } = require('mqtt');
const MQTTService = require('./MQTTServices');
const silos = [];
const silos_list =[];
let socket=null;
let lastPingTimestamp = null;
let pingIntervalId = null;
let checkIntervalId = null;

function init(io) {
    socket = io;
}

function pingPong(pingIntervale, pingTopic, mqttClient) {
    stopPingPong();
    console.log('start ping service...')
    pingIntervalId = setInterval(() => {
        lastPingTimestamp = Date.now();
        mqttClient.publish(pingTopic, '');
        console.log('Ping sent to all silos at', lastPingTimestamp);
    }, 1000); // Every 10s
    checkIntervalId = setInterval(() => {
    const now = Date.now();
    silos.forEach(silo => {
        // If last pong was more than 5s ago → consider disconnected
        if(!silo.lastPongTime || (now - silo.lastPongTime > 5000)) {
            if(silo.connectionStatus.connected) {
                if(silo.connectionStatus.connected){
                    socket.emit('notification',{type:'silo_status', from:silo.id, data:'disconnected'})
                }
                silo.connectionStatus.connected = false;
                silo.connectionStatus.ping = 99999999;
                console.log(`[WARN] Silo ${silo.id} marked as disconnected.`);
                socket.emit('silos_data', silos);
            }
        }
    });
    }, 1000); 

}

function stopPingPong() {
    console.log("Stopping ping-pong...");
    clearInterval(pingIntervalId);
    clearInterval(checkIntervalId);
    pingIntervalId = null;
    checkIntervalId = null;
}


function getLastPingTimestamp() {
    return lastPingTimestamp;
}

function addSilo(id) {
  const siloExists = silos_list.includes(id);

  if (!siloExists) {
    const newSilo = {
      id: id,
      connectionStatus: {
        connected: false,
        ping: null
      },
      lastPongTime: null,
      sensorStatus: {
        temperature: {
          level3:null,
          level2:null,
          level1:null},
        humidity: {
          level3:null,
          level2:null,
          level1:null},
        co2: null,
        level: null
      },
      actuatorStatus: {
        action: null,
        fan: null,  
        self_cool: null,
        filling: null,
        emptying: null        
      },
      referenceValues: {
        temperature: null,
        humidity: null,
        co2: null
      },
      emergensy_stop:null
    };
    silos.push(newSilo);
    silos_list.push(id);
    socket.emit('silos', silos_list);
    socket.emit('notification',{type:'silo_status', from:id, data:'added'})
  } else {
    console.log(`Silo with ID ${id} already exists.`);
    socket.emit('notification',{type:'silo_status', from:id, data:'silo already exict'})
  }
}

function deleteSilo(id) {
  const index = {
    silo:silos.findIndex(silo => silo.id === id),
    silo_list:silos_list.indexOf(id)
  }

  if (index.silo !== -1 || index.silo_list !== -1) {
    silos.splice(index.silo, 1);
    silos_list.splice(index.silo_list, 1);
    socket.emit('silos', silos_list);
    console.log(`Silo with ID ${id} has been deleted.`);
    socket.emit('notification',{type:'silo_status', from:id, data:'Removed'})
  } else {
    console.log(`Silo with ID ${id} does not exist.`);
  }
}



module.exports ={
    init,
    pingPong,
    addSilo,
    deleteSilo,
    stopPingPong,
    getLastPingTimestamp,
    silos : () => silos,
    silos_list : () => silos_list
}
