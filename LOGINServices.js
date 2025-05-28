const fs = require('fs');
const path = require('path');

let users = [];

function loadUsers() {
  const filePath = path.join(__dirname, 'users.json');
  users = JSON.parse(fs.readFileSync(filePath));
}

function init(app, io) {
  loadUsers();

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.json({ success: true, role: user.role });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Optional: you can emit login attempts or events over io if needed later
}

module.exports = { init };
