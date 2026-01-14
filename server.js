require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, 'db.json');

// Helper to read/write DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// API Routes

// Appointments
app.get('/api/appointments', (req, res) => {
    const db = readDB();
    res.json(db.appointments);
});

app.post('/api/appointments', (req, res) => {
    const db = readDB();
    const newAppointment = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
    db.appointments.push(newAppointment);
    writeDB(db);
    res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.appointments.findIndex(a => a.id === id);
    if (index !== -1) {
        db.appointments[index] = { ...db.appointments[index], ...req.body };
        writeDB(db);
        res.json(db.appointments[index]);
    } else {
        res.status(404).json({ error: 'Appointment not found' });
    }
});

app.delete('/api/appointments/:id', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    db.appointments = db.appointments.filter(a => a.id !== id);
    writeDB(db);
    res.status(204).end();
});

// Medications
app.get('/api/medications', (req, res) => {
    const db = readDB();
    res.json(db.medications);
});

app.post('/api/medications', (req, res) => {
    const db = readDB();
    const newMedication = { id: Date.now(), ...req.body, history: [], createdAt: new Date().toISOString() };
    db.medications.push(newMedication);
    writeDB(db);
    res.status(201).json(newMedication);
});

app.put('/api/medications/:id', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const index = db.medications.findIndex(m => m.id === id);
    if (index !== -1) {
        db.medications[index] = { ...db.medications[index], ...req.body };
        writeDB(db);
        res.json(db.medications[index]);
    } else {
        res.status(404).json({ error: 'Medication not found' });
    }
});

app.delete('/api/medications/:id', (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    db.medications = db.medications.filter(m => m.id !== id);
    writeDB(db);
    res.status(204).end();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
