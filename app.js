const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(':memory:');

// Pengaturan view engine dan static files
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Inisialisasi database
db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("CREATE TABLE sellers (id INTEGER PRIMARY KEY, name TEXT)");
    db.run("CREATE TABLE buyers (id INTEGER PRIMARY KEY, name TEXT)");
    db.run("CREATE TABLE prices (id INTEGER PRIMARY KEY, price REAL)");
    db.run("CREATE TABLE stocks (id INTEGER PRIMARY KEY, product_name TEXT, quantity INTEGER)");
});

// Middleware untuk memeriksa sesi login
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Route: Landing Page
app.get('/', (req, res) => {
    res.render('index');
});

// Route: Register Page
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    
    // Periksa apakah pengguna sudah ada
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (row) {
            res.render('register', { error: 'Username sudah terdaftar' });
        } else {
            // Tambahkan pengguna baru
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
                if (err) {
                    res.render('register', { error: 'Terjadi kesalahan saat mendaftar' });
                } else {
                    res.redirect('/login');
                }
            });
        }
    });
});


// Route: Login Page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            req.session.user = row;
            res.redirect('/users');
        } else {
            res.render('login', { error: 'Username atau password salah' });
        }
    });
});

// CRUD Users

// Tampilkan semua pengguna
app.get('/users', checkAuth, (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error loading users");
        } else {
            res.render('users', { users: rows });
        }
    });
});

// Tambah Pengguna
app.post('/users/add', checkAuth, (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error adding user");
        } else {
            res.redirect('/users');
        }
    });
});

// Edit Pengguna
app.post('/users/edit/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    db.run("UPDATE users SET username = ? WHERE id = ?", [username, id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error updating user");
        } else {
            res.redirect('/users');
        }
    });
});

// Delete Pengguna
app.post('/users/delete/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM users WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error deleting user");
        } else {
            res.redirect('/users');
        }
    });
});
// CRUD Sellers
app.get('/sellers', checkAuth, (req, res) => {
    db.all("SELECT * FROM sellers", [], (err, rows) => {
        res.render('sellers', { sellers: rows });
    });
});

app.post('/sellers/add', checkAuth, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO sellers (name) VALUES (?)", [name], () => {
        res.redirect('/sellers');
    });
});

// Display Sellers
app.get('/sellers', checkAuth, (req, res) => {
    db.all("SELECT * FROM sellers", [], (err, rows) => {
        if (err) {
            return res.status(500).send("Database error");
        }
        res.render('sellers', { sellers: rows });
    });
});

// Add New Seller
app.post('/sellers/add', checkAuth, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO sellers (name) VALUES (?)", [name], (err) => {
        if (err) {
            return res.status(500).send("Error adding seller");
        }
        res.redirect('/sellers');
    });
});

// Show Edit Form
app.get('/sellers/edit/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM sellers WHERE id = ?", [id], (err, seller) => {
        if (err) {
            return res.status(500).send("Database error");
        }
        res.render('edit_seller', { seller });
    });
});

// Update Seller
app.post('/sellers/edit/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    db.run("UPDATE sellers SET name = ? WHERE id = ?", [name, id], (err) => {
        if (err) {
            return res.status(500).send("Error updating seller");
        }
        res.redirect('/sellers');
    });
});

// Delete Seller
// Delete Penjual
app.post('/sellers/delete/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM sellers WHERE id = ?", [id], (err) => {
        if (err) {
            return res.status(500).send("Error deleting seller");
        }
        res.redirect('/sellers');
    });
});


// CRUD Buyers
app.get('/buyers', checkAuth, (req, res) => {
    db.all("SELECT * FROM buyers", [], (err, rows) => {
        res.render('buyers', { buyers: rows });
    });
});

app.post('/buyers/add', checkAuth, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO buyers (name) VALUES (?)", [name], () => {
        res.redirect('/buyers');
    });
});

// CRUD Prices
app.get('/prices', checkAuth, (req, res) => {
    db.all("SELECT * FROM prices", [], (err, rows) => {
        res.render('prices', { prices: rows });
    });
});

app.post('/prices/add', checkAuth, (req, res) => {
    const { price } = req.body;
    db.run("INSERT INTO prices (price) VALUES (?)", [price], () => {
        res.redirect('/prices');
    });
});

// CRUD Stocks
app.get('/stocks', checkAuth, (req, res) => {
    db.all("SELECT * FROM stocks", [], (err, rows) => {
        res.render('stocks', { stocks: rows });
    });
});

app.post('/stocks/add', checkAuth, (req, res) => {
    const { product_name, quantity } = req.body;
    db.run("INSERT INTO stocks (product_name, quantity) VALUES (?, ?)", [product_name, quantity], () => {
        res.redirect('/stocks');
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
