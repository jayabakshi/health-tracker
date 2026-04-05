// === STATE MANAGEMENT ===
const state = {
    user: JSON.parse(localStorage.getItem('ht_user')) || null,
    appointments: JSON.parse(localStorage.getItem('ht_appointments')) || [],
    medications: JSON.parse(localStorage.getItem('ht_medications')) || [],
    adherence: JSON.parse(localStorage.getItem('ht_adherence')) || {}, // Keyed by YYYY-MM-DD
    currentView: 'dashboard',
    editingId: null,
    editingType: null,
    theme: localStorage.getItem('ht_theme') || 'dark',
    calendar: {
        month: new Date().getMonth(),
        year: new Date().getFullYear()
    }
};

// === DOM ELEMENTS ===
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    contentArea: document.getElementById('content-area'),
    pageTitle: document.getElementById('page-title'),
    navBtns: document.querySelectorAll('.nav-btn'),
    mobileToggle: document.getElementById('mobile-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    addNewBtn: document.getElementById('add-new-btn'),
    exportBtn: document.getElementById('export-btn'),
    printBtn: document.getElementById('print-btn'),
    mainModal: document.getElementById('main-modal'),
    welcomeModal: document.getElementById('welcome-modal'),
    appointmentForm: document.getElementById('appointment-form'),
    medicationForm: document.getElementById('medication-form'),
    welcomeForm: document.getElementById('welcome-form'),
    closeModalBtn: document.getElementById('close-modal'),
    userDisplayName: document.getElementById('user-display-name'),
    userAvatar: document.getElementById('user-avatar'),
    apptBadge: document.getElementById('appointment-badge'),
    toastContainer: document.getElementById('toast-container'),
    calendarPopover: document.getElementById('calendar-popover')
};

// === STORAGE HELPERS ===
const syncStorage = () => {
    localStorage.setItem('ht_user', JSON.stringify(state.user));
    localStorage.setItem('ht_appointments', JSON.stringify(state.appointments));
    localStorage.setItem('ht_medications', JSON.stringify(state.medications));
    localStorage.setItem('ht_adherence', JSON.stringify(state.adherence));
    localStorage.setItem('ht_theme', state.theme);
};

// === UI UTILS ===
const showToast = (message, type = 'info') => {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${type.toUpperCase()}</div>
            <div class="toast-msg">${message}</div>
        </div>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

const sanitize = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const checkReminders = () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const hasUpcoming = state.appointments.some(a => {
        const d = new Date(a.date);
        return d > now && d < soon;
    });
    
    if (hasUpcoming) {
        elements.apptBadge.classList.remove('hidden');
    } else {
        elements.apptBadge.classList.add('hidden');
    }
};

// === RENDER FUNCTIONS ===
const renderDashboard = () => {
    elements.pageTitle.textContent = 'Dashboard';
    
    // Stats Calculations
    const today = getTodayKey();
    const activeMeds = state.medications.length;
    const apptsThisWeek = state.appointments.filter(a => {
        const d = new Date(a.date);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return d >= new Date() && d <= nextWeek;
    }).length;
    
    const takenToday = state.adherence[today] ? Object.keys(state.adherence[today]).length : 0;
    const adherenceRate = activeMeds > 0 ? Math.round((takenToday / activeMeds) * 100) : 0;

    // Upcoming Soon
    const upcoming = state.appointments
        .filter(a => new Date(a.date) > new Date())
        .sort((a,b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    let html = `
        <div class="stat-grid staggered-fade-in">
            <div class="stat-card">
                <span class="stat-label">Total Appointments</span>
                <span class="stat-value">${state.appointments.length}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Active Medications</span>
                <span class="stat-value">${activeMeds}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Upcoming (7 days)</span>
                <span class="stat-value">${apptsThisWeek}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Daily Adherence</span>
                <span class="stat-value">${adherenceRate}%</span>
                <span class="stat-trend trend-none">${takenToday}/${activeMeds} meds today</span>
            </div>
        </div>

        <div class="dashboard-main staggered-fade-in">
            <div class="content-card">
                <div class="card-title-row">
                    <h3>Appointment Trends</h3>
                    <div class="badge badge-info">Monthly View</div>
                </div>
                <div id="chart-container" style="height: 200px; display: flex; align-items: flex-end; gap: 10px; padding-top: 20px;">
                    <!-- Simple Bar Chart via CSS -->
                    ${generateBarChartHtml()}
                </div>
            </div>
            
            <div class="content-card">
                <div class="card-title-row">
                    <h3>Upcoming Soon</h3>
                </div>
                <div class="upcoming-list">
                    ${upcoming.length ? upcoming.map(a => {
                        const diff = new Date(a.date) - new Date();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const countdown = hours < 1 ? 'Starting soon' : `in ${hours} hours`;
                        return `
                            <div class="mini-event-item" style="border-left: 3px solid var(--accent-teal); padding: 1rem; margin-bottom: 1rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                <div style="font-weight: 700;">${sanitize(a.title)}</div>
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                                    ${formatDate(a.date)} • <span style="color: var(--accent-neon)">${countdown}</span>
                                </div>
                            </div>
                        `;
                    }).join('') : '<div class="empty-state">No upcoming events</div>'}
                </div>
            </div>
        </div>

        <div class="content-card staggered-fade-in">
            <h3>Medication Heatmap (Last 7 Days)</h3>
            <div class="heatmap-container">
                ${state.medications.length ? state.medications.map(med => generateHeatmapRow(med)).join('') : '<p>No medications tracked</p>'}
            </div>
        </div>
    `;
    elements.contentArea.innerHTML = html;
};

const generateBarChartHtml = () => {
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    const counts = new Array(12).fill(0);
    state.appointments.forEach(a => {
        const m = new Date(a.date).getMonth();
        counts[m]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((c, i) => `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <div style="width: 100%; max-width: 30px; height: ${(c/max)*100}%; background: var(--accent-teal); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 1s ease;"></div>
            <span style="font-size: 0.7rem; color: var(--text-secondary);">${months[i]}</span>
        </div>
    `).join('');
};

const generateHeatmapRow = (med) => {
    const labels = ['S','M','T','W','T','F','S'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const boxes = [];
    
    for(let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        const isTaken = state.adherence[key] && state.adherence[key][med.id];
        const isFuture = d > today;
        let status = isTaken ? 'taken' : (isFuture ? 'future' : 'missed');
        boxes.push(`<div class="heat-box ${status}" title="${d.toDateString()}"></div>`);
    }
    
    return `
        <div class="med-heatmap-row">
            <div class="med-info-mini">${sanitize(med.name)}</div>
            <div class="heatmap-boxes">${boxes.join('')}</div>
        </div>
    `;
};

const renderAppointments = () => {
    elements.pageTitle.textContent = 'Appointments';
    const sorted = [...state.appointments].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    let html = `
        <div class="filter-bar staggered-fade-in">
            <div class="search-input-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="search-appt" class="search-input" placeholder="Search by title or location...">
            </div>
        </div>
        <div class="grid-container staggered-fade-in" id="appt-list">
            ${sorted.length ? sorted.map(a => renderAppointmentCard(a)).join('') : renderEmptyState('📅', 'No appointments found')}
        </div>
    `;
    elements.contentArea.innerHTML = html;
    
    // Search listener
    document.getElementById('search-appt').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = sorted.filter(a => a.title.toLowerCase().includes(query) || (a.location && a.location.toLowerCase().includes(query)));
        document.getElementById('appt-list').innerHTML = filtered.length ? filtered.map(a => renderAppointmentCard(a)).join('') : '<p>No matching results</p>';
    });
};

const renderAppointmentCard = (a) => {
    const isPast = new Date(a.date) < new Date();
    return `
        <div class="card" data-id="${a.id}">
            <div class="card-header">
                <h4 style="font-size: 1.15rem; font-weight: 700;">${sanitize(a.title)}</h4>
                <div class="badge ${isPast ? 'badge-danger' : 'badge-success'}">${isPast ? 'Past' : 'Upcoming'}</div>
            </div>
            <div class="card-meta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>${formatDate(a.date)}</span>
            </div>
            <div class="card-meta">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 13 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${sanitize(a.location) || 'No location set'}</span>
            </div>
            ${a.notes ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 1rem; font-style: italic;">"${sanitize(a.notes)}"</p>` : ''}
            <div class="card-actions">
                <button onclick="editItem('appointment', ${a.id})" class="action-btn">Edit</button>
                <button onclick="deleteItem('appointment', ${a.id})" class="action-btn danger">Delete</button>
            </div>
        </div>
    `;
};

const renderMedications = () => {
    elements.pageTitle.textContent = 'Medications';
    
    let html = `
        <div class="filter-bar staggered-fade-in">
            <div class="search-input-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="search-med" class="search-input" placeholder="Search by name...">
            </div>
        </div>
        <div class="grid-container staggered-fade-in" id="med-list">
            ${state.medications.length ? state.medications.map(m => renderMedicationCard(m)).join('') : renderEmptyState('💊', 'No medications tracked')}
        </div>
    `;
    elements.contentArea.innerHTML = html;

    document.getElementById('search-med').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = state.medications.filter(m => m.name.toLowerCase().includes(query));
        document.getElementById('med-list').innerHTML = filtered.length ? filtered.map(m => renderMedicationCard(m)).join('') : '<p>No matching results</p>';
    });
};

const renderMedicationCard = (m) => {
    const today = getTodayKey();
    const isTaken = state.adherence[today] && state.adherence[today][m.id];
    
    // Calculate Streak (Simple version: checks consecutive days in adherence record)
    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const key = checkDate.toISOString().split('T')[0];
        if (state.adherence[key] && state.adherence[key][m.id]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return `
        <div class="card" data-id="${m.id}" style="${isTaken ? 'box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.05)' : ''}">
            <div class="card-header">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <h4 style="font-size: 1.15rem; font-weight: 700;">${sanitize(m.name)}</h4>
                    ${streak > 1 ? `<span style="font-size: 0.75rem; color: var(--accent-warning);"><svg style="display:inline; margin-bottom:-2px" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> ${streak} day streak!</span>` : ''}
                </div>
                <div class="badge ${isTaken ? 'badge-success' : 'badge-info'}">${isTaken ? 'Taken' : m.frequency}</div>
            </div>
            <p class="card-meta">Dosage: <b>${sanitize(m.dosage) || 'N/A'}</b></p>
            <p class="card-meta">Time: <b>${m.time}</b></p>
            <div class="card-actions">
                ${!isTaken ? `<button onclick="markMedTaken(${m.id})" class="action-btn" style="background: var(--accent-teal); border:none; color:white;">Mark Taken</button>` : `<button disabled class="action-btn" style="opacity: 0.5">Today Done</button>`}
                <button onclick="editItem('medication', ${m.id})" class="action-btn">Edit</button>
                <button onclick="deleteItem('medication', ${m.id})" class="action-btn danger">Delete</button>
            </div>
        </div>
    `;
};

const renderCalendar = () => {
    elements.pageTitle.textContent = 'Calendar';
    const { month, year } = state.calendar;
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = `
        <div class="calendar-wrapper staggered-fade-in">
            <div class="calendar-header">
                <button class="cal-nav-btn" onclick="changeMonth(-1)">&lt; Prev</button>
                <h3>${monthNames[month]} ${year}</h3>
                <button class="cal-nav-btn" onclick="changeMonth(1)">Next &gt;</button>
            </div>
            <div class="calendar-grid">
                <div class="cal-weekday">Sun</div><div class="cal-weekday">Mon</div><div class="cal-weekday">Tue</div>
                <div class="cal-weekday">Wed</div><div class="cal-weekday">Thu</div><div class="cal-weekday">Fri</div>
                <div class="cal-weekday">Sat</div>
                ${Array(firstDay).fill('<div class="cal-day other-month"></div>').join('')}
                ${Array.from({length: daysInMonth}, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const appts = state.appointments.filter(a => a.date.startsWith(dateStr));
                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                    
                    return `
                        <div class="cal-day ${isToday ? 'today' : ''}" onclick="showDayDetails('${dateStr}', event)">
                            <span class="cal-num">${day}</span>
                            <div class="cal-dots">
                                ${appts.length ? `<div class="cal-dot dot-appt"></div>` : ''}
                                ${state.adherence[dateStr] ? `<div class="cal-dot dot-med"></div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    elements.contentArea.innerHTML = html;
};

const renderEmptyState = (icon, text) => `
    <div class="empty-state">
        <div class="empty-illustration">${icon}</div>
        <p>${text}</p>
        <button class="primary-btn" onclick="openMainModal()">+ Add Something Now</button>
    </div>
`;

// === ACTION HANDLERS ===
window.changeMonth = (dir) => {
    state.calendar.month += dir;
    if (state.calendar.month < 0) { state.calendar.month = 11; state.calendar.year--; }
    if (state.calendar.month > 11) { state.calendar.month = 0; state.calendar.year++; }
    renderCalendar();
};

window.showDayDetails = (dateStr, event) => {
    const popover = elements.calendarPopover;
    const content = document.getElementById('popover-content');
    document.getElementById('popover-date').textContent = dateStr;
    
    const appts = state.appointments.filter(a => a.date.startsWith(dateStr));
    const medsTaken = state.adherence[dateStr] ? Object.keys(state.adherence[dateStr]).map(id => state.medications.find(m => m.id == id)).filter(Boolean) : [];

    content.innerHTML = `
        <div style="margin-bottom: 1rem">
            <h5 style="color: var(--accent-neon)">Appointments</h5>
            ${appts.length ? appts.map(a => `<div class="event-line"><div class="cal-dot dot-appt"></div>${sanitize(a.title)}</div>`).join('') : '<p style="font-size:0.8rem">None</p>'}
        </div>
        <div>
            <h5 style="color: var(--accent-success)">Medications Taken</h5>
            ${medsTaken.length ? medsTaken.map(m => `<div class="event-line"><div class="cal-dot dot-med"></div>${sanitize(m.name)}</div>`).join('') : '<p style="font-size:0.8rem">None</p>'}
        </div>
    `;

    popover.style.left = `${Math.min(event.clientX, window.innerWidth - 320)}px`;
    popover.style.top = `${Math.min(event.clientY, window.innerHeight - 250)}px`;
    popover.classList.remove('hidden');
};

window.markMedTaken = (id) => {
    const today = getTodayKey();
    if (!state.adherence[today]) state.adherence[today] = {};
    state.adherence[today][id] = true;
    syncStorage();
    renderMedications();
    showToast('Medication marked as taken!', 'success');
};

window.deleteItem = (type, id) => {
    // Native replacement for custom confirmation
    const confirmDelete = confirm(`Are you sure you want to delete this ${type}?`);
    if (!confirmDelete) return;

    if (type === 'appointment') {
        state.appointments = state.appointments.filter(a => a.id !== id);
    } else {
        state.medications = state.medications.filter(m => m.id !== id);
    }
    syncStorage();
    render();
    showToast('Deleted successfully', 'warning');
};

window.editItem = (type, id) => {
    state.editingId = id;
    state.editingType = type;
    
    if (type === 'appointment') {
        const a = state.appointments.find(i => i.id === id);
        elements.appointmentForm.elements['title'].value = a.title;
        const [d, t] = a.date.split('T');
        elements.appointmentForm.elements['appt-date'].value = d;
        elements.appointmentForm.elements['appt-time'].value = t;
        elements.appointmentForm.elements['location'].value = a.location || '';
        elements.appointmentForm.elements['notes'].value = a.notes || '';
        showForm('appointment');
    } else {
        const m = state.medications.find(i => i.id === id);
        elements.medicationForm.elements['name'].value = m.name;
        elements.medicationForm.elements['dosage'].value = m.dosage || '';
        elements.medicationForm.elements['frequency'].value = m.frequency;
        elements.medicationForm.elements['time'].value = m.time;
        showForm('medication');
    }
    
    document.getElementById('modal-title').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    elements.mainModal.showModal();
};

const openMainModal = () => {
    state.editingId = null;
    state.editingType = null;
    document.getElementById('modal-title').textContent = 'Add New';
    elements.appointmentForm.reset();
    elements.medicationForm.reset();
    
    if (state.currentView === 'medications') showForm('medication');
    else showForm('appointment');
    
    elements.mainModal.showModal();
};

const showForm = (type) => {
    if (type === 'appointment') {
        elements.appointmentForm.classList.remove('hidden');
        elements.medicationForm.classList.add('hidden');
    } else {
        elements.medicationForm.classList.remove('hidden');
        elements.appointmentForm.classList.add('hidden');
    }
};

const render = () => {
    localStorage.setItem('ht_last_view', state.currentView);
    if (state.currentView === 'dashboard') renderDashboard();
    else if (state.currentView === 'appointments') renderAppointments();
    else if (state.currentView === 'medications') renderMedications();
    else if (state.currentView === 'calendar') renderCalendar();
    
    // Update active nav
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === state.currentView);
    });
    
    checkReminders();
};

// === EVENT LISTENERS ===
elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.currentView = btn.dataset.view;
        render();
        if (window.innerWidth < 768) toggleSidebar();
    });
});

const toggleSidebar = () => {
    elements.sidebar.classList.toggle('open');
    elements.sidebarOverlay.classList.toggle('open');
};

elements.mobileToggle.addEventListener('click', toggleSidebar);
elements.sidebarOverlay.addEventListener('click', toggleSidebar);

elements.addNewBtn.addEventListener('click', openMainModal);
elements.closeModalBtn.addEventListener('click', () => elements.mainModal.close());

// Form Submissions
elements.appointmentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkValidity()) {
        f.classList.add('was-validated');
        Array.from(f.elements).forEach(el => {
            if (el.parentNode.classList.contains('form-group')) {
                el.parentNode.classList.toggle('invalid', !el.checkValidity());
            }
        });
        return;
    }

    const data = {
        id: state.editingId || Date.now(),
        title: f.title.value,
        date: `${f['appt-date'].value}T${f['appt-time'].value}`,
        location: f.location.value,
        notes: f.notes.value
    };

    if (state.editingId) {
        const idx = state.appointments.findIndex(a => a.id === state.editingId);
        state.appointments[idx] = data;
    } else {
        state.appointments.push(data);
    }
    
    syncStorage();
    render();
    elements.mainModal.close();
    showToast('Appointment saved!', 'success');
});

elements.medicationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkValidity()) {
        f.classList.add('was-validated');
        Array.from(f.elements).forEach(el => {
            if (el.parentNode.classList.contains('form-group')) {
                el.parentNode.classList.toggle('invalid', !el.checkValidity());
            }
        });
        return;
    }

    const data = {
        id: state.editingId || Date.now(),
        name: f.name.value,
        dosage: f.dosage.value,
        frequency: f.frequency.value,
        time: f.time.value
    };

    if (state.editingId) {
        const idx = state.medications.findIndex(m => m.id === state.editingId);
        state.medications[idx] = data;
    } else {
        state.medications.push(data);
    }
    
    syncStorage();
    render();
    elements.mainModal.close();
    showToast('Medication added!', 'success');
});

elements.welcomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target.userName.value;
    const age = e.target.userAge.value;
    if (name && age) {
        state.user = { name, age };
        syncStorage();
        initUserUI();
        elements.welcomeModal.close();
        showToast(`Welcome, ${name}!`, 'success');
    }
});

// Theme Toggle
const initTheme = () => {
    document.body.className = state.theme === 'dark' ? 'dark-mode' : 'light-mode';
    document.getElementById('sun-icon').classList.toggle('hidden', state.theme === 'dark');
    document.getElementById('moon-icon').classList.toggle('hidden', state.theme === 'light');
};

elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    syncStorage();
    initTheme();
});

// Export & Print
elements.exportBtn.addEventListener('click', () => {
    const data = { appointments: state.appointments, medications: state.medications, adherence: state.adherence };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthtrend_export_${getTodayKey()}.json`;
    a.click();
    showToast('Data exported as JSON', 'success');
});

elements.printBtn.addEventListener('click', () => {
    const printSection = document.getElementById('print-section');
    printSection.innerHTML = `
        <h1 style="color: #06b6d4">HealthTrend Summary</h1>
        <p>User: ${state.user ? state.user.name : 'Guest'}</p>
        <hr>
        <h2>Active Medications</h2>
        <ul>${state.medications.map(m => `<li>${m.name} (${m.dosage}) - ${m.frequency} at ${m.time}</li>`).join('')}</ul>
        <h2>Upcoming Appointments</h2>
        <ul>${state.appointments.filter(a => new Date(a.date) > new Date()).map(a => `<li>${a.title} - ${formatDate(a.date)}</li>`).join('')}</ul>
    `;
    window.print();
});

// Popover Close
document.getElementById('close-popover').addEventListener('click', () => elements.calendarPopover.classList.add('hidden'));

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    
    if (e.key.toLowerCase() === 'n') openMainModal();
    if (e.key === 'Escape') {
        elements.mainModal.close();
        elements.calendarPopover.classList.add('hidden');
    }
    if (e.key === '1') { state.currentView = 'dashboard'; render(); }
    if (e.key === '2') { state.currentView = 'appointments'; render(); }
    if (e.key === '3') { state.currentView = 'medications'; render(); }
    if (e.key === '4') { state.currentView = 'calendar'; render(); }
});

// === INITIALIZATION ===
const initUserUI = () => {
    if (state.user) {
        elements.userDisplayName.textContent = state.user.name;
        elements.userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
    }
};

const init = () => {
    initTheme();
    initUserUI();
    if (!state.user) {
        setTimeout(() => elements.welcomeModal.showModal(), 1000);
    }
    
    // Skeleton loader simulation
    const skeleton = document.getElementById('skeleton-loader');
    skeleton.classList.remove('hidden');
    setTimeout(() => {
        skeleton.classList.add('hidden');
        render();
    }, 800);
};

init();
