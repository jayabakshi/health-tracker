// App State
const state = {
    appointments: JSON.parse(localStorage.getItem('appointments')) || [],
    medications: JSON.parse(localStorage.getItem('medications')) || [],
    currentView: 'dashboard',
    editingId: null,
    editingType: null // 'appointment' or 'medication'
};

// Migrate Data Structure (Ensure medications have history)
state.medications.forEach(med => {
    if (!med.history) med.history = [];
});

// DOM Elements
const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('page-title');
const navBtns = document.querySelectorAll('.nav-btn');
const addNewBtn = document.getElementById('add-new-btn');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modal-title');
const appointmentForm = document.getElementById('appointment-form');
const medicationForm = document.getElementById('medication-form');

// Utils
const saveState = () => {
    localStorage.setItem('appointments', JSON.stringify(state.appointments));
    localStorage.setItem('medications', JSON.stringify(state.medications));
    render();
};

const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

const isTakenToday = (medication) => {
    const today = new Date().toDateString();
    return medication.history.some(timestamp => new Date(timestamp).toDateString() === today);
};

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentView = btn.dataset.view;
        render();
    });
});

// Modal Handling
const openModal = (type = null, id = null) => {
    modalOverlay.classList.remove('hidden');
    state.editingId = id;
    state.editingType = type;

    if (id) {
        modalTitle.textContent = type === 'appointment' ? 'Edit Appointment' : 'Edit Medication';
        // Pre-fill forms
        if (type === 'appointment') {
            const item = state.appointments.find(a => a.id === id);
            showAppointmentForm();
            appointmentForm.elements['title'].value = item.title;
            const [datePart, timePart] = item.date.split('T');
            appointmentForm.elements['appt-date'].value = datePart;
            appointmentForm.elements['appt-time'].value = timePart;
            appointmentForm.elements['location'].value = item.location;
            appointmentForm.elements['notes'].value = item.notes;
        } else {
            const item = state.medications.find(m => m.id === id);
            showMedicationForm();
            medicationForm.elements['name'].value = item.name;
            medicationForm.elements['dosage'].value = item.dosage;
            medicationForm.elements['frequency'].value = item.frequency;
            medicationForm.elements['time'].value = item.time;
        }
    } else {
        // Create Mode
        modalTitle.textContent = 'Add';
        // Default View Logic
        if (state.currentView === 'medications') {
            showMedicationForm();
        } else {
            showAppointmentForm();
        }
    }
};

const closeModal = () => {
    modalOverlay.classList.add('hidden');
    appointmentForm.reset();
    medicationForm.reset();
    state.editingId = null;
    state.editingType = null;
};

const showAppointmentForm = () => {
    appointmentForm.classList.remove('hidden');
    medicationForm.classList.add('hidden');
};

const showMedicationForm = () => {
    medicationForm.classList.remove('hidden');
    appointmentForm.classList.add('hidden');
};

addNewBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Form Submissions
appointmentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(appointmentForm);

    // Combine date and time
    const datePart = formData.get('appt-date');
    const timePart = formData.get('appt-time');
    const isoDate = `${datePart}T${timePart}`;

    // Clash Detection Logic (Assume 60 min duration)
    const proposedStart = new Date(isoDate);
    const proposedEnd = new Date(proposedStart.getTime() + 60 * 60 * 1000);

    const checkCollision = (start, end, excludeId = null) => {
        return state.appointments.some(appt => {
            if (excludeId && appt.id === excludeId) return false;
            const apptStart = new Date(appt.date);
            const apptEnd = new Date(apptStart.getTime() + 60 * 60 * 1000);
            return apptStart < end && apptEnd > start;
        });
    };

    if (checkCollision(proposedStart, proposedEnd, state.editingId)) {
        // Find next available slot
        let nextTime = new Date(proposedStart);
        let found = false;
        // Search for next 24 slots (1 day)
        for (let i = 0; i < 24; i++) {
            nextTime = new Date(nextTime.getTime() + 60 * 60 * 1000);
            const nextEnd = new Date(nextTime.getTime() + 60 * 60 * 1000);
            if (!checkCollision(nextTime, nextEnd, state.editingId)) {
                found = true;
                break;
            }
        }

        const timeString = nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showToast(`❌ Clash detected! Try ${timeString} instead.`, 'error');
        return; // Block submission
    }

    const data = {
        title: formData.get('title'),
        date: isoDate,
        location: formData.get('location'),
        notes: formData.get('notes')
    };

    if (state.editingId) {
        // Edit
        const index = state.appointments.findIndex(a => a.id === state.editingId);
        if (index !== -1) {
            state.appointments[index] = { ...state.appointments[index], ...data };
        }
    } else {
        // Create
        state.appointments.push({
            id: Date.now(),
            ...data,
            createdAt: new Date().toISOString()
        });
    }
    saveState();
    closeModal();
});

medicationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(medicationForm);
    const data = {
        name: formData.get('name'),
        dosage: formData.get('dosage'),
        frequency: formData.get('frequency'),
        time: formData.get('time')
    };

    if (state.editingId) {
        const index = state.medications.findIndex(m => m.id === state.editingId);
        if (index !== -1) {
            state.medications[index] = { ...state.medications[index], ...data };
        }
    } else {
        state.medications.push({
            id: Date.now(),
            ...data,
            history: [],
            createdAt: new Date().toISOString()
        });
    }
    saveState();
    closeModal();
});

// Actions
window.deleteItem = (type, id) => {
    if (!confirm('Are you sure?')) return;
    if (type === 'appointment') {
        state.appointments = state.appointments.filter(a => a.id !== id);
    } else {
        state.medications = state.medications.filter(m => m.id !== id);
    }
    saveState();
};

window.editItem = (type, id) => {
    openModal(type, id);
};

window.markTaken = (id) => {
    const med = state.medications.find(m => m.id === id);
    if (med) {
        med.history.push(new Date().toISOString());
        saveState();
        // Visual feedack handled by render
    }
};

// Render Functions
const renderDashboard = () => {
    pageTitle.textContent = 'Dashboard';
    const upcomingAppointments = state.appointments
        .filter(a => new Date(a.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    // Adherence Stats
    const activeMeds = state.medications.filter(m => m.frequency === 'daily' || m.frequency === 'asNeeded');
    const takenCount = activeMeds.filter(m => isTakenToday(m)).length;

    // Adherence History (Current Week: Mon-Sun)
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sun) - 6 (Sat)
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    let adherenceHtml = '<div class="adherence-strip">';
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toDateString();

        // Get history for this day
        const dayActiveMeds = state.medications.filter(m => (m.frequency === 'daily' || m.frequency === 'asNeeded') && new Date(m.createdAt) <= d);

        let statusClass = 'neutral';
        const isFuture = d > today && d.toDateString() !== today.toDateString();

        if (isFuture) {
            statusClass = 'neutral';
        } else if (dayActiveMeds.length > 0) {
            const medsTakenCount = dayActiveMeds.filter(m => m.history.some(h => new Date(h).toDateString() === dateStr)).length;

            if (medsTakenCount === dayActiveMeds.length && medsTakenCount > 0) statusClass = 'full';
            else if (medsTakenCount > 0) statusClass = 'partial';
            else statusClass = 'none';
        }

        // Fix for Today (if empty and day not over)
        if (dateStr === today.toDateString()) {
            if (takenCount === activeMeds.length && activeMeds.length > 0) statusClass = 'full';
            else if (takenCount > 0) statusClass = 'partial';
            else statusClass = 'neutral';
        }

        adherenceHtml += `
            <div class="ad-day" title="${d.toLocaleDateString()}">
                <div class="ad-indicator ${statusClass}"></div>
                <div class="ad-label">${d.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
            </div>
        `;
    }
    adherenceHtml += '</div>';

    let html = `
        <div class="dashboard-stats">
            <div class="stat-card">
                <div class="stat-value">${state.appointments.length}</div>
                <div class="stat-label">Total Appointments</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, var(--accent), #be185d);">
                <div class="stat-value">${takenCount}/${activeMeds.length}</div>
                <div class="stat-label">Meds Taken Today</div>
            </div>
        </div>
        
        <h3 style="margin-bottom: 1rem;">Adherence History (Last 7 Days)</h3>
        <div class="card" style="margin-bottom: 2rem;">
            ${adherenceHtml}
        </div>
        
        <h3 style="margin-bottom: 1rem;">Upcoming Appointments</h3>
        <div class="grid-container">
            ${upcomingAppointments.length ? upcomingAppointments.map(appt => `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${appt.title}</div>
                        <div class="status-badge">Upcoming</div>
                    </div>
                    <div class="card-meta">📅 ${formatDate(appt.date)}</div>
                    <div class="card-meta">📍 ${appt.location || 'No location'}</div>
                </div>
            `).join('') : '<p style="color: var(--text-muted);">No upcoming appointments.</p>'}
        </div>
    `;
    contentArea.innerHTML = html;
};

const renderAppointments = () => {
    pageTitle.textContent = 'My Appointments';
    const sorted = [...state.appointments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const getStatus = (date) => new Date(date) < new Date() ?
        `<span class="status-badge" style="background:#f1f5f9; color:#64748b">Past</span>` :
        `<span class="status-badge">Upcoming</span>`;

    const html = `
        <div class="grid-container">
            ${sorted.map(appt => `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${appt.title}</div>
                        ${getStatus(appt.date)}
                    </div>
                    <div class="card-meta">📅 ${formatDate(appt.date)}</div>
                    <div class="card-meta">📍 ${appt.location || 'No location'}</div>
                    ${appt.notes ? `<div class="card-meta" style="margin-top:0.5rem; font-style:italic;">"${appt.notes}"</div>` : ''}
                    <div class="card-actions">
                        <button onclick="editItem('appointment', ${appt.id})" class="action-btn">Edit</button>
                        <button onclick="deleteItem('appointment', ${appt.id})" class="action-btn delete">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
        ${sorted.length === 0 ? '<p>No appointments scheduled.</p>' : ''}
    `;
    contentArea.innerHTML = html;
};

const renderMedications = () => {
    pageTitle.textContent = 'Medications';

    const html = `
        <div class="grid-container">
            ${state.medications.map(med => {
        const taken = isTakenToday(med);
        return `
                <div class="card ${taken ? 'med-taken' : ''}">
                    <div class="card-header">
                        <div class="card-title">${med.name}</div>
                        ${taken ? '<span class="status-badge success">Taken Today</span>' : '<span class="status-badge">Active</span>'}
                    </div>
                    <div class="card-meta">💊 Dosage: ${med.dosage || 'N/A'}</div>
                    <div class="card-meta">🔁 Freq: ${med.frequency}</div>
                    <div class="card-meta">⏰ Time: ${med.time}</div>
                    
                    <div class="card-actions">
                        ${!taken ? `<button onclick="markTaken(${med.id})" class="action-btn primary">Mark Taken</button>` : ''}
                        <button onclick="editItem('medication', ${med.id})" class="action-btn">Edit</button>
                        <button onclick="deleteItem('medication', ${med.id})" class="action-btn delete">Delete</button>
                    </div>
                </div>
            `}).join('')}
        </div>
        ${state.medications.length === 0 ? '<p>No medications tracked.</p>' : ''}
    `;
    contentArea.innerHTML = html;
};

const renderCalendar = () => {
    pageTitle.textContent = 'Calendar';
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const dayCount = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let calendarHtml = `
        <div class="calendar-header">
            <h3>${monthNames[currentMonth]} ${currentYear}</h3>
        </div>
        <div class="calendar-grid">
            <div class="cal-day-header">Sun</div>
            <div class="cal-day-header">Mon</div>
            <div class="cal-day-header">Tue</div>
            <div class="cal-day-header">Wed</div>
            <div class="cal-day-header">Thu</div>
            <div class="cal-day-header">Fri</div>
            <div class="cal-day-header">Sat</div>
    `;

    // Empty spots
    for (let i = 0; i < startingDay; i++) {
        calendarHtml += `<div class="cal-day empty"></div>`;
    }

    // Days
    for (let i = 1; i <= dayCount; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Find events
        const apptsToday = state.appointments.filter(a => a.date.startsWith(dateStr));
        const hasEvents = apptsToday.length > 0;
        const isToday = i === now.getDate();

        calendarHtml += `
            <div class="cal-day ${isToday ? 'today' : ''}">
                <div class="day-num">${i}</div>
                ${hasEvents ? `<div class="event-dots">
                    ${apptsToday.map(() => `<span class="dot"></span>`).join('')}
                </div>` : ''}
            </div>
        `;
    }

    calendarHtml += `</div>`; // Close grid

    // List events for today/selected (Simplified: just list all this month below)
    calendarHtml += `
        <div class="calendar-events-list">
            <h4>Events this Month</h4>
            ${state.appointments
            .filter(a => new Date(a.date).getMonth() === currentMonth)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(a => `<div class="mini-event-item"><b>${formatDate(a.date)}</b>: ${a.title}</div>`)
            .join('') || '<p>No appointments this month.</p>'}
        </div>
    `;

    contentArea.innerHTML = calendarHtml;
};

const render = () => {
    if (state.currentView === 'dashboard') renderDashboard();
    else if (state.currentView === 'appointments') renderAppointments();
    else if (state.currentView === 'medications') renderMedications();
    else if (state.currentView === 'calendar') renderCalendar();
};

const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Success' : 'Reminder'}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);

    // Manual dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
};

// Reminder System (Poller)
setInterval(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    state.medications.forEach(med => {
        if (med.time === currentTime && !isTakenToday(med) && !med.lastReminded) {
            showToast(`Time to take ${med.name} (${med.dosage})`, 'info');
            med.lastReminded = true;
            setTimeout(() => med.lastReminded = false, 60000);
        }
    });
}, 5000);

// Init
render();
