const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();
const port = 5000;
const API_BASE = "/api";
const DB_FILE = path.join(__dirname, "mockDatabase.json");

const corsOptions = {
    origin: "http://localhost:3001", // Replace with frontend URL in production
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true, // Allow cookies/session sharing
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(
    session({
      secret: "e82f12a5d3b10a5b36b792f289c3d8a7c7e3a43e8345d23a9d8bdb89f52c5a76",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // Set true for HTTPS
    })
  );

// Load mock database from file or initialize
const loadDatabase = () => {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  }
  return { users: {} };
};

// Save mock database to file
const saveDatabase = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Register a new user
app.post(`${API_BASE}/register`, (req, res) => {
  const { username, password } = req.body;
  const database = loadDatabase();

  if (database.users[username]) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  database.users[username] = { password, todos: [] };
  saveDatabase(database);
  res.json({ success: true });
});

// Login user
app.post(`${API_BASE}/login`, (req, res) => {
  const { username, password } = req.body;
  const database = loadDatabase();

  if (!database.users[username] || database.users[username].password !== password) {
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }

  req.session.user = username;
  res.json({ success: true, message: "Login successful", user: database.users });
});

app.get(`${API_BASE}/verify-session`, (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
    
      res.json({ success: true, username: req.session.user });
  });

  app.post(`${API_BASE}/logout`, (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out" });
  });

// Get user todos
app.get(`${API_BASE}/todos/:username`, (req, res) => {
  const { username } = req.params;
  const database = loadDatabase();
  const todos = database.users[username]?.todos || [];

  res.json(todos);
});

// Add new todo
app.post(`${API_BASE}/todos/:username`, (req, res) => {
  const { username } = req.params;
  const todo = req.body;
  const database = loadDatabase();

  if (!database.users[username]) {
    database.users[username] = { password: "", todos: [] };
  }

  database.users[username].todos.push(todo);
  saveDatabase(database);
  res.json({ success: true });
});

// Toggle todo completion
app.put(`${API_BASE}/todos/:username/:todoId`, (req, res) => {
  const { username, todoId } = req.params;
  const database = loadDatabase();
  const todoIdNum = parseInt(todoId);

  if (!database.users[username]) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  database.users[username].todos = database.users[username].todos.map((todo) =>
    todo.id === todoIdNum ? { ...todo, completed: !todo.completed } : todo
  );

  saveDatabase(database);
  res.json({ success: true });
});

// Edit a todo
app.put(`${API_BASE}/todos/:username/:todoId/edit`, (req, res) => {
  const { username, todoId } = req.params;
  const { text } = req.body;
  const database = loadDatabase();
  const todoIdNum = parseInt(todoId);

  if (!database.users[username]) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const todoIndex = database.users[username].todos.findIndex((todo) => todo.id === todoIdNum);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: "Todo not found" });
  }

  database.users[username].todos[todoIndex].text = text;
  saveDatabase(database);
  res.json({ success: true, message: "Todo updated successfully" });
});

// Delete a todo
app.delete(`${API_BASE}/todos/:username/:todoId`, (req, res) => {
  const { username, todoId } = req.params;
  const database = loadDatabase();
  const todoIdNum = parseInt(todoId);

  if (!database.users[username]) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  database.users[username].todos = database.users[username].todos.filter((todo) => todo.id !== todoIdNum);
  saveDatabase(database);
  res.json({ success: true });
});

// Start the server
app.listen(port, () => {
  console.log(`Mock API running at http://localhost:${port}`);
});
