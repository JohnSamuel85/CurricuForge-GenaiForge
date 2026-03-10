// ═══════════════════════════════════════
//  CurricuForge — Main SPA Logic (v3 clean)
// ═══════════════════════════════════════

// ── Global state ──
let appToken = localStorage.getItem('token');
let globalCurriculums = {};
let currentCurriculumId = null;
let progressChart = null;

// ── Utility: parse JWT ──
function parseJwt(t) {
    try { return JSON.parse(atob(t.split('.')[1])); }
    catch (_) { return null; }
}

// ── Toast helper ──
function showToast(msg, isError = true) {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-title').textContent = isError ? 'Error' : 'Success';
    document.getElementById('toast-msg').textContent = msg;
    icon.style.color = isError ? '#EF4444' : '#16A34A';
    icon.className = isError ? 'ph ph-warning-circle' : 'ph ph-check-circle';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ════════════════════════════════════════
//  AUTH LOGIC
// ════════════════════════════════════════

function showLanding() {
    document.getElementById('landing-page').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
}

function showApp() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    if (appToken) {
        const p = parseJwt(appToken);
        if (p && p.sub) {
            document.getElementById('sidebar-email').textContent = p.sub;
        }
    }
    loadHistory();
    switchView('view-dashboard');
}

function openModal(type) {
    document.getElementById('modal-login').classList.remove('open');
    document.getElementById('modal-signup').classList.remove('open');
    document.getElementById(type === 'login' ? 'modal-login' : 'modal-signup').classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function overlayClose(event, id) {
    if (event.target === document.getElementById(id)) closeModal(id);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pwd = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-err');
    const btn = document.getElementById('login-btn');
    errEl.style.display = 'none';
    if (!email || !pwd) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }
    btn.innerHTML = '<span class="auth-spinner"></span> Signing in…';
    btn.disabled = true;
    try {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', pwd);
        const res = await fetch('/api/auth/login', { method: 'POST', body: params });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid credentials.');
        appToken = data.access_token;
        localStorage.setItem('token', appToken);
        closeModal('modal-login');
        showApp();
    } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
    } finally {
        btn.innerHTML = 'Sign In';
        btn.disabled = false;
    }
}

async function handleSignup() {
    const email = document.getElementById('signup-email').value.trim();
    const pwd = document.getElementById('signup-password').value;
    const errEl = document.getElementById('signup-err');
    const btn = document.getElementById('signup-btn');
    errEl.style.display = 'none';
    if (!email || !pwd) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return; }
    if (pwd.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = 'block'; return; }
    btn.innerHTML = '<span class="auth-spinner"></span> Creating account…';
    btn.disabled = true;
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pwd })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Signup failed.');
        // Auto-login
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', pwd);
        const loginRes = await fetch('/api/auth/login', { method: 'POST', body: params });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error('Account created! Please sign in.');
        appToken = loginData.access_token;
        localStorage.setItem('token', appToken);
        closeModal('modal-signup');
        showApp();
    } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
    } finally {
        btn.innerHTML = 'Create Account';
        btn.disabled = false;
    }
}

// ════════════════════════════════════════
//  SPA VIEW ROUTING
// ════════════════════════════════════════

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active-view'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active-view');
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.target === viewId);
    });
    if (viewId === 'view-dashboard' || viewId === 'view-history') loadHistory();
}

// ════════════════════════════════════════
//  FORM WIZARD
// ════════════════════════════════════════

function initWizard() {
    const form = document.getElementById('roadmap-form');
    const steps = document.querySelectorAll('.form-step');
    const progressBar = document.getElementById('form-progress-bar');
    const stepIndicator = document.getElementById('step-indicator');
    let currentStep = 0;

    function goTo(index) {
        steps[currentStep].classList.add('hidden');
        currentStep = index;
        steps[currentStep].classList.remove('hidden');
        progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
        stepIndicator.textContent = `STEP ${currentStep + 1} OF ${steps.length}`;
        if (currentStep === 3) populateReview();
    }

    function populateReview() {
        document.getElementById('review-skills').textContent = document.getElementById('skills-input').value || '-';
        document.getElementById('review-domain').textContent = document.getElementById('domain-input').value || '-';
        document.getElementById('review-role').textContent = document.getElementById('role-input').value || '-';
        document.getElementById('review-time').textContent = (document.getElementById('time-input').value || '-') + ' hrs/wk';
        const paceEl = document.getElementById('pace-input');
        document.getElementById('review-pace').textContent = paceEl.options[paceEl.selectedIndex]?.text || '-';
    }

    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep === 0 && !document.getElementById('skills-input').value.trim()) {
                return showToast('Please enter your skills.');
            }
            if (currentStep === 1 && (!document.getElementById('domain-input').value.trim() || !document.getElementById('role-input').value.trim())) {
                return showToast('Please enter domain and role.');
            }
            if (currentStep === 2 && !document.getElementById('time-input').value.trim()) {
                return showToast('Please enter weekly hours.');
            }
            if (currentStep === 2 && !document.getElementById('pace-input').value) {
                return showToast('Please select your proficiency level.');
            }
            if (currentStep < steps.length - 1) goTo(currentStep + 1);
        });
    });

    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 0) goTo(currentStep - 1);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('flex');
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('skills', document.getElementById('skills-input').value);
            formData.append('domain', document.getElementById('domain-input').value);
            formData.append('role', document.getElementById('role-input').value);
            formData.append('time', document.getElementById('time-input').value);
            formData.append('pace', document.getElementById('pace-input').value);
            const resumeFile = document.getElementById('resume-input').files[0];
            if (resumeFile) formData.append('resume', resumeFile);

            const headers = appToken ? { 'Authorization': `Bearer ${appToken}` } : {};
            const res = await fetch('/api/curriculum/generate', { method: 'POST', headers, body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Generation failed.');

            const newId = data.id || Date.now();
            globalCurriculums[newId] = data;

            // Reset form
            form.reset();
            goTo(0);
            progressBar.style.width = '25%';

            openCurriculumDetail(newId, data);

        } catch (err) {
            showToast(err.message);
        } finally {
            overlay.classList.remove('flex');
            submitBtn.disabled = false;
        }
    });
}

// ════════════════════════════════════════
//  HISTORY / DASHBOARD
// ════════════════════════════════════════

async function loadHistory() {
    if (!appToken) return;

    try {
        const res = await fetch('/api/curriculum/my-curriculums', {
            headers: { 'Authorization': `Bearer ${appToken}` }
        });
        if (!res.ok) return;

        const list = await res.json();

        list.forEach(c => { globalCurriculums[c.id] = c; });

        // Dashboard stats
        document.getElementById('stat-total').textContent = list.length;

        let totalChecked = 0;
        let activeCount = 0;

        list.forEach(c => {
            const saved = JSON.parse(localStorage.getItem(`cf_progress_${c.id}`) || '{}');
            const checked = Object.keys(saved).length;
            const total = getTotalTopics(c);
            totalChecked += checked;
            if (checked > 0 && checked < total) activeCount++;
        });

        document.getElementById('stat-milestones').textContent = totalChecked;
        document.getElementById('stat-active').textContent = activeCount;

        // Dashboard recent cards
        const recentEl = document.getElementById('dashboard-recent');
        const emptyEl = document.getElementById('dashboard-empty');

        if (list.length === 0) {
            recentEl.innerHTML = '';
            emptyEl.style.display = 'block';
        } else {
            emptyEl.style.display = 'none';
            recentEl.innerHTML = list.slice(0, 5).map(c => buildMiniCard(c)).join('');
        }

        // History grid
        const histEl = document.getElementById('history-grid');
        if (histEl) {
            histEl.innerHTML = list.length
                ? list.map(c => buildFullCard(c)).join('')
                : '<div style="color:#64748B;padding:40px 0;text-align:center;">No past generations found.</div>';
        }

    } catch (e) {
        console.error('loadHistory error:', e);
    }
}

function getTotalTopics(c) {
    let total = 0;
    if (c.output_json && c.output_json.weekly_breakdown) {
        c.output_json.weekly_breakdown.forEach(w => { total += (w.topics || []).length; });
    }
    return total;
}

function getPercent(c) {
    const saved = JSON.parse(localStorage.getItem(`cf_progress_${c.id}`) || '{}');
    const checked = Object.keys(saved).length;
    const total = getTotalTopics(c);
    return total > 0 ? Math.round((checked / total) * 100) : 0;
}

function buildMiniCard(c) {
    const date = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const pct = getPercent(c);
    const pctColor = pct === 100 ? '#16A34A' : '#64748B';
    const pctBg = pct === 100 ? '#F0FDF4' : '#F8FAFC';
    return `<div class="card card-hover" style="padding:16px 20px;" onclick="openCurriculumDetail(${c.id})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <h4 style="font-weight:700;font-size:15px;margin:0;">${c.input_json.role}</h4>
                    <span style="background:${pctBg};color:${pctColor};border:1px solid ${pct === 100 ? '#BBF7D0' : '#E2E8F0'};padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;">${pct}%</span>
                </div>
                <p style="font-size:12px;color:#94A3B8;margin:3px 0 0;">${date} &bull; ${c.output_json.timeline_weeks} weeks &bull; ${c.input_json.domain}</p>
            </div>
            <i class="ph ph-caret-right" style="color:#CBD5E1;font-size:20px;"></i>
        </div>
    </div>`;
}

function buildFullCard(c) {
    const date = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const pct = getPercent(c);
    const pctColor = pct === 100 ? '#16A34A' : '#2563EB';
    return `<div class="card card-hover" onclick="openCurriculumDetail(${c.id})">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <h3 style="font-weight:700;font-size:16px;margin:0;">${c.input_json.role}</h3>
            <span style="font-size:12px;color:#94A3B8;">${date}</span>
        </div>
        <p style="font-size:13px;color:#64748B;margin:0 0 4px;"><strong>Domain:</strong> ${c.input_json.domain}</p>
        <p style="font-size:13px;color:#64748B;margin:0 0 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><strong>Skills:</strong> ${c.input_json.skills}</p>
        
        <!-- Progress bar -->
        <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:5px;">
                <span>Progress</span><span style="font-weight:700;color:${pctColor};">${pct}%</span>
            </div>
            <div style="height:5px;background:#F1F5F9;border-radius:999px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${pct === 100 ? '#16A34A' : '#2563EB'};border-radius:999px;transition:width 0.4s ease;"></div>
            </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid #F1F5F9;">
            <span class="pill">${c.output_json.timeline_weeks} Weeks</span>
            <span style="font-size:12px;font-weight:700;color:#2563EB;display:flex;align-items:center;gap:4px;">View <i class="ph ph-arrow-right"></i></span>
        </div>
    </div>`;
}

// ════════════════════════════════════════
//  SYLLABUS DETAIL VIEW
// ════════════════════════════════════════

function openCurriculumDetail(id, freshData) {
    const c = freshData || globalCurriculums[id];
    if (!c) return;
    currentCurriculumId = c.id || id;
    switchView('view-syllabus');
    renderSyllabus(c);
}

function renderSyllabus(c) {
    const cId = c.id || currentCurriculumId;
    const saved = JSON.parse(localStorage.getItem(`cf_progress_${cId}`) || '{}');
    const total = getTotalTopics(c);
    const checked = Object.keys(saved).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

    const weeks = c.output_json.weekly_breakdown || [];

    const syllabusHtml = weeks.map((week, wi) => {
        const topicsHtml = (week.topics || []).map((topic, ti) => {
            const key = `${wi}-${ti}`;
            const isDone = !!saved[key];
            return `<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #F8FAFC;cursor:pointer;">
                <input type="checkbox" data-key="${key}" data-cid="${cId}" ${isDone ? 'checked' : ''}
                    style="width:16px;height:16px;margin-top:2px;accent-color:#2563EB;cursor:pointer;flex-shrink:0;">
                <span style="font-size:14px;${isDone ? 'text-decoration:line-through;color:#94A3B8;' : 'color:#0F172A;'}">${topic}</span>
            </label>`;
        }).join('');

        return `<div class="card" style="margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                <div style="width:36px;height:36px;background:#EFF6FF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#2563EB;flex-shrink:0;">W${week.week}</div>
                <div>
                    <div style="font-weight:700;font-size:15px;">${week.focus}</div>
                    <div style="font-size:12px;color:#64748B;">${week.estimated_hours}hrs est.</div>
                </div>
            </div>
            ${topicsHtml}
            ${week.resources && week.resources.length ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #F1F5F9;">
                <p style="font-size:12px;font-weight:700;color:#64748B;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Resources</p>
                ${week.resources.map(r => `<div style="font-size:13px;color:#2563EB;margin-bottom:4px;"><i class="ph ph-link" style="margin-right:6px;"></i>${r}</div>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('');

    const skillGaps = (c.output_json.skill_gap_analysis || []).map(g => `<li style="font-size:14px;color:#334155;margin-bottom:6px;">${g}</li>`).join('');
    const projects = (c.output_json.suggested_projects || []).map(p => `<li style="font-size:14px;color:#334155;margin-bottom:6px;">${p}</li>`).join('');
    const certs = (c.output_json.certifications || []).map(ct => `<li style="font-size:14px;color:#334155;margin-bottom:6px;">${ct}</li>`).join('');

    document.getElementById('syllabus-content').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 320px;gap:28px;align-items:start;">
            <!-- Left: Timeline -->
            <div>
                <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.03em;margin:0 0 4px;">${c.input_json.role}</h2>
                <p style="color:#64748B;font-size:14px;margin:0 0 24px;">${c.input_json.domain} &bull; ${c.output_json.timeline_weeks} weeks &bull; ${c.input_json.pace || c.input_json.skills}</p>
                <h3 style="font-size:16px;font-weight:700;margin:0 0 14px;">Weekly Breakdown</h3>
                ${syllabusHtml}
            </div>

            <!-- Right: Progress Panel -->
            <div style="position:sticky;top:30px;">
                <div class="card" style="margin-bottom:16px;text-align:center;padding:28px;">
                    <canvas id="progress-chart" width="160" height="160" style="max-width:160px;margin:0 auto 16px;display:block;"></canvas>
                    <p style="font-size:28px;font-weight:800;margin:0 0 2px;" id="pct-display">${pct}%</p>
                    <p style="font-size:13px;color:#64748B;margin:0;" id="topics-counter">${checked} of ${total} topics done</p>
                </div>

                ${skillGaps ? `<div class="card" style="margin-bottom:16px;">
                    <p style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Skill Gaps</p>
                    <ul style="margin:0;padding-left:16px;">${skillGaps}</ul>
                </div>` : ''}

                ${projects ? `<div class="card" style="margin-bottom:16px;">
                    <p style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Suggested Projects</p>
                    <ul style="margin:0;padding-left:16px;">${projects}</ul>
                </div>` : ''}

                ${certs ? `<div class="card">
                    <p style="font-size:13px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Certifications</p>
                    <ul style="margin:0;padding-left:16px;">${certs}</ul>
                </div>` : ''}
            </div>
        </div>`;

    // Mount chart
    mountChart(pct);

    // Checkbox listeners
    document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
        cb.addEventListener('change', () => {
            const cid = cb.dataset.cid;
            const key = cb.dataset.key;
            const state = JSON.parse(localStorage.getItem(`cf_progress_${cid}`) || '{}');
            const label = cb.closest('label');
            const span = label.querySelector('span');
            if (cb.checked) {
                state[key] = true;
                if (span) { span.style.textDecoration = 'line-through'; span.style.color = '#94A3B8'; }
            } else {
                delete state[key];
                if (span) { span.style.textDecoration = ''; span.style.color = '#0F172A'; }
            }
            localStorage.setItem(`cf_progress_${cid}`, JSON.stringify(state));
            // Update chart + counters in real time
            const newChecked = Object.keys(state).length;
            const newTotal = getTotalTopics(globalCurriculums[cid] || c);
            const newPct = newTotal > 0 ? Math.round((newChecked / newTotal) * 100) : 0;
            document.getElementById('pct-display').textContent = newPct + '%';
            const counter = document.getElementById('topics-counter');
            if (counter) counter.textContent = `${newChecked} of ${newTotal} topics done`;
            updateChart(newPct);
        });
    });
}

function updateChart(pct) {
    // Update data in-place for smooth real-time animation (no destroy/recreate flash)
    if (progressChart) {
        const color = pct === 100 ? '#16A34A' : '#2563EB';
        progressChart.data.datasets[0].data = [pct, 100 - pct];
        progressChart.data.datasets[0].backgroundColor = [color, '#F1F5F9'];
        progressChart.update();
    } else {
        mountChart(pct);
    }
}

function mountChart(pct) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    if (progressChart) { progressChart.destroy(); progressChart = null; }
    progressChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: [pct === 100 ? '#16A34A' : '#2563EB', '#F1F5F9'],
                borderWidth: 0,
                hoverOffset: 0,
            }]
        },
        options: {
            cutout: '78%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 500 },
        }
    });
}

// ════════════════════════════════════════
//  BOOTSTRAP
// ════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

    // Auth guard
    if (appToken) {
        showApp();
    } else {
        showLanding();
    }

    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.target));
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            appToken = null;
            showLanding();
        });
    }

    // Init wizard
    initWizard();
});
