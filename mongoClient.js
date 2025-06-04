const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Change if using Atlas or remote
const client = new MongoClient(uri);

let db;

async function initMongo() {
  try {
    await client.connect();
    db = client.db('silo_system');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
  }
}

function getCollection(name) {
  return db.collection(name);
}

module.exports = {
  initMongo,
  getCollection
};
