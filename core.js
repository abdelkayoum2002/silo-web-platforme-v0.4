const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const MQTTService = require('./MQTTServices');
const CLIENTService = require('./CLIENTServices');
const DATAService = require('./DATAServices');
const ControlServices = require('./ControlServices');
const LOGINService = require('./LOGINServices');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

LOGINService.init(app, io);
MQTTService.init(io);
CLIENTService.init(io);
DATAService.init(io);
ControlServices.init(io);
io.on('connection', (socket) => {
    let userRole = null;
    /*DATAService.getMessages((err, rows) => {
        if (err) {
            console.error('DB Error:', err);
            socket.emit('tableData', []);
        return;
        }
        socket.emit('tableData', rows); // Send data to frontend
    });*/
    socket.emit('configuration', MQTTService.configuration());
    socket.emit('silos', CLIENTService.silos_list());
    socket.emit('silos_data',CLIENTService.silos());
    socket.emit('mqtt_status',MQTTService.status());
    socket.emit('topics', MQTTService.topics());

    socket.on('set_role', (role) => {
        userRole = role;
    });

    socket.on('add_silo', (id) => {
        /*if(userRole === 'admin')*/ CLIENTService.addSilo(id);
    });

    socket.on('delete_silo', (id) => {
        CLIENTService.deleteSilo(id);
    });

    socket.on('mqtt_connect', (configuration) => {
        MQTTService.connectToMQTT(configuration);
    });

    socket.on('mqtt_disconnect', () => {
        MQTTService.disconnectMQTT();
    });

     socket.on('subscribe' , ({ type, topic, qos }) =>{
        MQTTService.subscribeToTopic(type,topic, qos);
    });

    socket.on('unsubscribe', (topic)=> {
        console.log(topic)
        MQTTService.unsubscribeToTopic(topic);
    });

    socket.on('deleteTopic', (topic)=> {
        console.log(topic)
        MQTTService.deleteTopic(topic);
    });
    socket.on('publish', ({ topic, message, qos, retain }) =>{
        MQTTService.publishToTopic(topic,message,qos,retain)
    });

    socket.on('SQLCommande', ({Commande,Paramtere}) => {
        DATAService.SQLCommande({Commande,Paramtere},socket);
    });

    socket.on('Control', ({ siloId,cmd,value }) =>{
        console.log(siloId,cmd,value)
        ControlServices.dispatchCommand(siloId,cmd,value);
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});