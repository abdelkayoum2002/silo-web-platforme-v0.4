const mqtt = require('mqtt');
const CLIENTService = require('./CLIENTServices');
const DATAService = require("./DATAServices"); 

let socket=null;
let mqttClient=null;
let mqttConfig=null;
let mqttStatus ='disconnected';
let mqttError = null;


const PREDEFINED_TYPES = ["EmergencyTopic", "AlertTopic", "MessageTopic", "CommandTopic", "SensorTopic","StatusTopic"];

const topics={};

function init(io) {
    socket = io;
}

function connectToMQTT(configuration){
  console.log(configuration)
    mqttConfig=configuration;
    if(!configuration.url){
        mqttError={type: 'connection_error', message: `no url`};
        socket.emit('mqttError',mqttError);
        console.log(mqttError);
        return; // when no url return
    }

    if (mqttClient && mqttClient.connected) {
        return socket.emit('mqtt_status', { status: 'connected' });//when you already connect to mqtt return
    }
    
    mqttStatus = 'connecting';
    socket.emit('mqtt_status', mqttStatus );
    socket.emit('notification',{type:'mqttStatus',from:'mqtt',data:mqttStatus})
    mqttClient = mqtt.connect(configuration.url, configuration.options);

    mqttClient.on('connect', () => {
        console.log('MQTT connected');
        console.log(configuration)
        mqttStatus = 'connected';
        socket.emit('mqtt_status', mqttStatus);
        socket.emit('notification',{type:'mqttStatus',from:'mqtt',data:mqttStatus})
        for (const type in topics) {
        topics[type].forEach(t => {
          subscribeToTopic(type,t.topic,t.qos)
        });
      }
    });

    mqttClient.on('close', () => {
        console.log('MQTT disconnected');
        mqttStatus = 'disconnected';
        socket.emit('mqtt_status',mqttStatus);
        socket.emit('notification',{type:'mqttStatus',from:'mqtt',data:mqttStatus})
        for (const type in topics) {
        topics[type].forEach(topic => {
          topic.status='unsubscribe';
        });
        }
        socket.emit('topics',topics);
        CLIENTService.stopPingPong();
    });

    mqttClient.on('offline', () => {
        console.log('MQTT offline');
        mqttStatus = 'offline';
        socket.emit('mqtt_status',mqttStatus);
        socket.emit('notification',{type:'mqttStatus',from:'mqtt',data:mqttStatus})
    })

    mqttClient.on('message', (topic, data) => {
        
        let type = findTypeByTopic(topic)?.type;
        if(type===undefined){
            const t=topic.split("/").slice(0, -1).join("/");
            type=findTypeByTopic(t)?.type;
        }
        console.log(`[${type}] ${topic} ${data}`)
        DATAService.DDS({type,topic,data})
    });
    
    mqttClient.on('reconnect', () => {
      console.log('MQTT Reconnect...');
      mqttStatus = 'reconnect';
      socket.emit('mqtt_status',mqttStatus);
      socket.emit('notification',{type:'mqttStatus',from:'mqtt',data:mqttStatus})
    });
        mqttClient.on('error', (err) => {
      if(mqttClient){
      if (mqttClient.connected || mqttClient.reconnecting) {
        disconnectMQTT();
      }
      }
      console.error('MQTT Error:', err);
      mqttStatus = 'error';
      mqttError = {type: 'connection_error', message: err.message || 'Unknown error'};
      socket.emit('mqtt_error',mqttError);  
      console.error(mqttError.type,mqttError.message);   
    });
};

function disconnectMQTT() {
  if (mqttClient) {
    if (mqttClient.connected || mqttClient.reconnecting) {
      mqttClient.end();
    }
    mqttClient = null;
  }
}

function subscribeToTopic(type, topic, qos) {
  if (!mqttClient){
    mqttError = {type: 'subscribtion_error', message: `not conected`};
    socket.emit('mqtt_error',mqttError);
    console.error(mqttError.type,mqttError.message);
    return;}
  if(topic===''){
    mqttError = {type: 'subscribtion_error', message: `empty topic name`};
    socket.emit('mqtt_error',mqttError);
    console.error(mqttError.type,mqttError.message);
  return;}
  const existe= findTypeByTopic(topic)
  if(existe){
  if(existe.entry.status!='unsubscribe'){
    mqttError = {type: 'subscribtion_error', message: `topic already exists in type [${existe.type}]`};
    socket.emit('mqtt_error',mqttError);
    console.error(mqttError.type,mqttError.message);
    return;
  }}
  if(type==='CommandTopic'){
    topics[type] = [{ topic:topic, qos:qos, status:'publisher' }];
    socket.emit('notification',{type:'subscription',from:'mqtt',data:`${topic} type:[${type}]`})
    socket.emit('topics',topics);
    return;
  }
  qos = Number(qos);
  mqttClient.subscribe(topic+'/+', { qos }, (err) => {
    if (err) {
      mqttError = {type: 'subscribtion_error', message: err.message || 'Unknown error'};
      socket.emit('mqtt_error',mqttError);
      console.error(mqttError.type,mqttError.message);
    } else {
      console.log(`subscribtio to:[${type}] ${topic} qos ${qos}` )
      socket.emit('notification',{type:'subscription',from:'mqtt',data:`${topic} type:[${type}]`})
      if (PREDEFINED_TYPES.includes(type) && type !=='StatusTopic') {
        topics[type] = [{ topic:topic, qos:qos, status:'subscribe' }]; // Only one topic per predefined type
      } else if(type==='StatusTopic'){
        if(topic.endsWith("/ping")){CLIENTService.pingPong(1000,topic,mqttClient);}
        if (!topics[type]) topics[type] = [];
        if(existe){if(existe.entry.status ==="unsubscribe"){topics[type] = [{ topic:topic, qos:qos, status:'subscribe' }];}}
        else{    topics[type].push({ topic:topic, qos:qos, status:'subscribe' })}
      }
      console.log(topics);
      socket.emit('topics',topics);
    }
  });
}

function publishToTopic(topic,message,qos,retain){
  if(!mqttClient){
    mqttError = {type: 'publishing_error', message: `not conected`};
    socket.emit('mqtt_error',mqttError);
    console.error(mqttError.type,mqttError.message);
    return;
  }
   mqttClient.publish(topic,message,{qos:qos,retain:retain}, (err) => {
    if(err){
      mqttError = {type: 'publishing_error', message: err.message};
      socket.emit('mqtt_error',mqttError);
      console.error(mqttError.type,mqttError.message);
      return;
    }
    console.log(`Publish msg:${message} to ${topic}`);
   })
}

function findTypeByTopic(inputTopic) {
  for (const type in topics) {
    for (const entry of topics[type]) {
      if (entry.topic === inputTopic) {
        return { type: type, entry };
      }
    }
  }
  return null; // not found
}

function unsubscribeToTopic(topicStr) {
  if (!mqttClient){return;}
  for (const type in topics) {
    const topic = topics[type].find(t => t.topic === topicStr);
    if (topic) {
      mqttClient.unsubscribe(topicStr+'/+', (err) => {
        if(err){      
        mqttError = {type: 'unsubscribtion_error', message: err.message || 'Unknown error'};
        socket.emit('mqtt_error',mqttError);
        console.error(mqttError.type,mqttError.message);
        return;}
        if(topicStr.endsWith('/ping')){CLIENTService.stopPingPong()}
        topic.status = topic.status === 'subscribe' ? 'unsubscribe' : 'subscribe';
        console.log(`Unsubscribe topic:${topicStr}`);
        socket.emit('notification',{type:'unsubscription',from:'mqtt',data:`${topicStr}`})
        socket.emit('topics',topics);
      })
    }
  }
}

function deleteTopic(topic) {
  unsubscribeToTopic(topic)
  for (const type in topics) {
    const index = topics[type].findIndex(t => t.topic === topic);
    if (index !== -1) {
      topics[type].splice(index, 1); // Remove the topic
      if (topics[type].length === 0) {
        delete topics[type]; // Remove the group if empty
      }
    }
  }
  console.log('delete topic:',topic);
  socket.emit('topics',topics)
}


module.exports = {
    init,
    connectToMQTT,
    disconnectMQTT,
    subscribeToTopic,
    unsubscribeToTopic,
    deleteTopic,
    publishToTopic,
    status: () => mqttStatus,
    configuration: () => mqttConfig,
    topics: () => topics
}