const MQTTService = require('./MQTTServices');
function init(io) {
    socket = io;
}
function Filling(){
    const cmd={
        action:'Filling',
        top_valve:true,
        elevator:true,
        conveyor:2 //inverse since
    }
    return JSON.stringify(cmd);
}

function stopFilling(){
    const cmd={
        action:'stopFilling',
        top_valve:false,
        elevator:false,
        conveyor:0 //stop
    }
    return JSON.stringify(cmd);
}

function Emptying(){
    const cmd = {
        action: 'Emptying',
        bottom_valve: true,
        conveyor: 1 // direct sense
    };
    return JSON.stringify(cmd);
}

function stopEmptying(){
    const cmd = {
        action: 'stopEmptying',
        bottom_valve: false,
        conveyor: 0 // stop
    };
    return JSON.stringify(cmd);
}


function Temperature(value) {
    const cmd = {
        action:'Temperature',
        temperature: value
    };
    return JSON.stringify(cmd);
}

function CO2(value) {
    const cmd = {
        action:'CO2',
        co2: value
    };
    return JSON.stringify(cmd);
}

function Humidity(value){
    const cmd={
        action:'Humidity',
        humidity:value
    }
    return JSON.stringify(cmd);
}

function dispatchCommand(siloId,cmd,value){
    if(MQTTService.topics()?.CommandTopic && MQTTService.topics()?.CommandTopic[0].status ==='publisher'){
        const topic = MQTTService.topics().CommandTopic[0].topic + `/${siloId}`;
        const qos = MQTTService.topics().CommandTopic[0].qos;
        switch(cmd){
            case 'Filling':
                MQTTService.publishToTopic(topic,Filling(),qos,false);
            break;
            case 'stopFilling':
                MQTTService.publishToTopic(topic,stopFilling(),qos,false);
            break;
            case 'Emptying':
                MQTTService.publishToTopic(topic,Emptying(),qos,false);
            break;
            case 'stopEmptying':
                MQTTService.publishToTopic(topic,stopEmptying(),qos,false);
            break;
            case 'Temperature':
                MQTTService.publishToTopic(topic, Temperature(value), qos, false);
            break;
            case 'CO2':
                MQTTService.publishToTopic(topic, CO2(value), qos, false);
            break;
            case 'Humidity':
                MQTTService.publishToTopic(topic,Humidity(value),qos,false);
            break;
        }
    }
    
}

module.exports = {
    init,
    dispatchCommand
}