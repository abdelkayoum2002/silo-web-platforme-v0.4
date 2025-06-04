
const CLIENTService = require('./CLIENTServices');
const { getCollection } = require('./mongoClient');
const Database = require('better-sqlite3');
const db = new Database('silo_data.db');

let socket=null;
let message = null;

db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    silo_id TEXT NOT NULL,
    temperature_level1 REAL,
    temperature_level2 REAL,
    temperature_level3 REAL,
    humidity_level1 REAL,
    humidity_level2 REAL,
    humidity_level3 REAL,
    co2 REAL,
    level REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    "from" TEXT,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reference_values_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    silo_id TEXT NOT NULL,
    temperature REAL,
    humidity REAL,
    co2 REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function init(io) {
    socket = io;
}

function storeSensersData(siloId, data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO sensor_data (silo_id, temperature_level1, temperature_level2, temperature_level3, humidity_level1, humidity_level2, humidity_level3, co2, level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(siloId, data.temperature.level1, data.temperature.level2, data.temperature.level3, data.humidity.level1, data.humidity.level2, data.humidity.level3, data.co2, data.level);
    console.log(`✔ sensor Data stored for silo ${siloId}`);
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}

function storeReferenceValues(siloId, data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO reference_values_data (silo_id, temperature, humidity, co2)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(siloId, data.temperature, data.humidity, data.co2);
    console.log(`✔Reference values stored for silo ${siloId}`);
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}


function storeMessages(type, from, data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO messages_data (type, "from", message)
      VALUES (?, ?, ?)
    `);
    stmt.run(type, from, data);
    console.log(`✔ Message stored for silo ${from}`);
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}

function getMessages(callback) {
  try {
    const rows = db.prepare("SELECT * FROM messages_data ORDER BY timestamp DESC").all();
    callback(null, rows);
  } catch (err) {
    callback(err, []);
  }
}
 
function sendTable(err,rows,targetsocket){
    if (err) {
        console.error('DB Error:', err);
        return;
        }
    targetsocket.emit('tableData', rows); // Send data to frontend
}

function SQLCommande(query, targetsocket) {
  console.log(query);
  try {
    switch (query.Commande) {
      case 'getMSG':
        const msgs = db.prepare(`
          SELECT * FROM messages_data ORDER BY timestamp DESC, id DESC LIMIT 11 OFFSET ?
        `).all(query.Paramtere ?? 0);
        sendTable(null, msgs, targetsocket);
        break;

      case 'search':
        if (query.Paramtere && query.Paramtere.value !== '') {
          const val = `%${query.Paramtere.value}%`;
          const stmt = db.prepare(`
            SELECT * FROM messages_data
            WHERE type LIKE ? OR "from" LIKE ? OR message LIKE ?
            ORDER BY ${query.Paramtere.order.orderBy} ${query.Paramtere.order.direction}
          `);
          const results = stmt.all(val, val, val);
          sendTable(null, results, targetsocket);
        } else {
          SQLCommande({ Commande: 'getMSG', Paramtere: 0 }, targetsocket);
        }
        break;

      case 'deleteMSG':
        db.prepare('DELETE FROM messages_data WHERE id = ?').run(query.Paramtere);
        console.log(`Message with id ${query.Paramtere} deleted`);
        break;

      case 'getSnr':
        const snrData = db.prepare(`
          SELECT temperature, humidity, co2, level, timestamp
          FROM sensor_data
          WHERE silo_id = ? AND timestamp BETWEEN ? AND ?
        `).all(query.Paramtere.siloId, query.Paramtere.from, query.Paramtere.to);
        targetsocket.emit('storedSensor_data', { data: snrData, id: query.Paramtere.siloId });
        console.log({ data: snrData, id: query.Paramtere.siloId })
        break;

      case 'getlastSnr':
        const lastSnr = db.prepare(`
          SELECT id, timestamp FROM sensor_data
            WHERE silo_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 1;
        `).get(query.Paramtere.siloId);
        targetsocket.emit('storedlastSensor_time', { data: lastSnr, id: query.Paramtere.siloId });
        break;
      case 'getallSnr':
        const allsnrData = db.prepare(`
          SELECT temperature_level1, temperature_level2, temperature_level3, humidity_level1, humidity_level2, humidity_level3, co2, level, timestamp
          FROM sensor_data
          WHERE silo_id = ?
          ORDER BY timestamp DESC, id DESC
        `).all(query.Paramtere.siloId);
        targetsocket.emit('storedSensor_data', { data: allsnrData, id: query.Paramtere.siloId });
        console.log({ data: allsnrData, id: query.Paramtere.siloId })
        break;
    }
  } catch (err) {
    console.error('DB Error:', err.message);
    sendTable(err, [], targetsocket);
  }
}


function DDS(msg){
    let parts = msg.topic.split('/');
    const siloId = parts.pop();             // 'unknown'
    const topic = parts.join('/');  
    const silo = CLIENTService.silos().find(s => s.id === siloId);
    if(msg.type==='SensorTopic'){
        const data = JSON.parse(msg.data);
        if(silo){
        const sensor = data?.sensorStatus;
        const actuator = data?.actuatorStatus;
        const reference = data?.referenceValues;
          if(sensor){
            silo.sensorStatus = {
                temperature: {
                  level3:sensor?.temperature?.level3 ?? null,
                  level2:sensor?.temperature?.level2 ?? null,
                  level1:sensor?.temperature?.level1 ?? null,},
                humidity: {
                  level3:sensor?.humidity?.level3 ?? null,
                  level2:sensor?.humidity?.level2 ?? null,
                  level1:sensor?.humidity?.level1 ?? null,},
                co2: sensor?.co2 ?? null,
                level: sensor?.level ?? null
            };
          }if(actuator){
            silo.actuatorStatus = {
                action:actuator?.action ?? null,  
                fan:actuator?.fan ?? null,  
                self_cool:actuator?.self_cool ?? null,
                filling:actuator?.filling ?? null,
                emptying:actuator?.emptying ?? null  
            };
          }
            if(reference){
              socket.emit('notification',{type:'refVal',from:silo.id,data:silo.referenceValues})
            }
            silo.referenceValues = {
                temperature: reference?.temperature ?? null,
                humidity: reference?.humidity ?? null,
                co2: reference?.co2 ?? null,
            }
            silo.connectionStatus.connected = true;
            silo.emergensy_stop=false;
            socket.emit('silos_data', CLIENTService.silos());
            // Store sensor data
            storeSensersData(siloId, silo.sensorStatus);
            storeReferenceValues(siloId, silo.referenceValues);
        }
    }
    if(msg.type==='EmergencyTopic'){
        message= {type:'Emergency', from:siloId, data:"Emergency Stop"}
        if(silo){
          silo.emergensy_stop=true;
          silo.connectionStatus.connected = false;
          socket.emit('silos_data', CLIENTService.silos());
        }
        socket.emit('message', message);
        storeMessages(message.type, message.from, message.data)
        console.log(message)
    }
    if(msg.type==='AlertTopic'){
        message= {type:'Alert', from:siloId, data:msg.data.toString()}
        socket.emit('message', message);
        storeMessages(message.type, message.from, message.data)
        /*getMessages((err, rows) => {
        if (err) {
            console.error('DB Error:', err);
            socket.emit('tableData', []);
        return;
        }
        socket.emit('tableData', rows); // Send data to frontend
    });*/
        console.log(message)
    }
    if(msg.type==='MessageTopic'){
        message= {type:'Message', from:siloId, data:msg.data.toString()}
        socket.emit('message', message);
        storeMessages(message.type, message.from, message.data)
        console.log(message)
    }
    if (msg.type === 'StatusTopic') {
        const sousType = topic.split('/').pop();
        if (sousType === 'ping') {
            const now = Date.now();
            if (silo && CLIENTService.getLastPingTimestamp) {
                const pingTime = CLIENTService.getLastPingTimestamp();
                if(!silo.connectionStatus.connected){
                    socket.emit('notification',{type:'silo_status', from:siloId, data:'connected'})
    
                }
                silo.connectionStatus.connected = true;
                silo.connectionStatus.ping = now - pingTime;
                silo.lastPongTime = now; // update lastPong time
                socket.emit('silos_data', CLIENTService.silos());
                console.log(`pong received from ${siloId}, latency: ${silo.connectionStatus.ping}ms`);
            }
        }
    }

}

module.exports = {
    init,
    DDS,
    getMessages,
    SQLCommande,
    message: () => message
}
