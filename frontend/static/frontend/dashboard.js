// frontend/static/frontend/dashboard.js

const API = '/api';
const access = localStorage.getItem('access');
if (!access) window.location.href = '/';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access}`
    };
}

async function apiFetch(url, options = {}) {
    const res = await fetch(url, { headers: authHeaders(), ...options });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(Object.values(err).flat().join(' ') || 'Request failed');
    }
    return res.json();
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// ============ TEAMS ============
async function loadTeams() {
    try {
        const teams = await apiFetch(`${API}/teams/`);
        const container = document.getElementById('teamsList');
        if (!teams || teams.length === 0) {
            container.innerHTML = '<div class="text-muted text-center py-3">No teams yet.</div>';
            return;
        }
        container.innerHTML = teams.map(t => `
            <a href="#" class="list-group-item list-group-item-action team-card" onclick="selectTeam(${t.id}, '${t.name.replace(/'/g, "\\'")}')">
                <div class="d-flex justify-content-between">
                    <strong>${t.name}</strong>
                    <i class="bi bi-trash text-danger" onclick="event.stopPropagation(); deleteTeam(${t.id})" title="Delete team"></i>
                </div>
                <small class="text-muted">${t.description || ''}</small>
            </a>`).join('');
    } catch (e) {
        console.error(e);
    }
}

async function createTeam() {
    const name = document.getElementById('teamName').value.trim();
    const description = document.getElementById('teamDesc').value.trim();
    if (!name) return alert('Team name required');
    await apiFetch(`${API}/teams/`, { method: 'POST', body: JSON.stringify({ name, description }) });
    document.getElementById('teamName').value = '';
    document.getElementById('teamDesc').value = '';
    bootstrap.Modal.getInstance(document.getElementById('teamModal')).hide();
    loadTeams();
}

async function deleteTeam(id) {
    if (!confirm('Delete this team? All tasks will be lost.')) return;
    await apiFetch(`${API}/teams/${id}/`, { method: 'DELETE' });
    if (selectedTeamId === id) { clearTasksView(); }
    loadTeams();
}

// ============ TASKS ============
let selectedTeamId = null;

async function selectTeam(id, name) {
    selectedTeamId = id;
    document.getElementById('currentTeamName').textContent = name;
    document.getElementById('tasksHeader').style.display = 'flex';
    await loadMembers(id);
    loadTasks();
}

function clearTasksView() {
    selectedTeamId = null;
    document.getElementById('tasksHeader').style.display = 'none';
    document.getElementById('tasksList').innerHTML = '<p class="text-muted">Select a team to view its tasks.</p>';
}

async function loadMembers(teamId) {
    try {
        const members = await apiFetch(`${API}/teams/${teamId}/members/`);
        const sel = document.getElementById('taskAssignee');
        sel.innerHTML = '<option value="">Unassigned</option>';
        if (members && members.length) {
            members.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.user;
                opt.textContent = m.username || m.user_email || `User ${m.user}`;
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadTasks() {
    try {
        const tasks = await apiFetch(`${API}/tasks/`);
        const teamTasks = tasks.filter(t => t.team == selectedTeamId);
        const div = document.getElementById('tasksList');
        if (teamTasks.length === 0) {
            div.innerHTML = '<div class="text-muted text-center py-3">No tasks for this team. Click "Add Task" to create one.</div>';
            return;
        }
        div.innerHTML = `
            <table class="table table-hover">
                <thead class="table-light">
                    <tr><th>Title</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${teamTasks.map(t => {
                        const safeTask = JSON.stringify(t).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
                        return `
                        <tr class="task-row" onclick='editTask(${safeTask})' data-bs-toggle="modal" data-bs-target="#taskModal">
                            <td>${t.title}</td>
                            <td><span class="badge ${statusBadge(t.status)}">${t.status.replace('_',' ')}</span></td>
                            <td><span class="badge bg-${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'secondary'}">${t.priority}</span></td>
                            <td>${t.assignee || '—'}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteTask(${t.id})" title="Delete"><i class="bi bi-trash"></i></button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        console.error(e);
    }
}

function statusBadge(status) {
    if (status === 'todo') return 'badge-todo';
    if (status === 'in_progress') return 'badge-in-progress';
    return 'badge-done';
}

function clearTaskForm() {
    document.getElementById('editTaskId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskStatus').value = 'todo';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskAssignee').value = '';
    document.getElementById('taskModalLabel').textContent = 'New Task';
}

function editTask(task) {
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskAssignee').value = task.assignee || '';
    document.getElementById('taskModalLabel').textContent = 'Edit Task';
}

async function saveTask() {
    const id = document.getElementById('editTaskId').value;
    const data = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDesc').value.trim(),
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value || null,
        team: selectedTeamId
    };
    if (!data.title) return alert('Title is required');

    if (id) {
        await apiFetch(`${API}/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
    } else {
        await apiFetch(`${API}/tasks/`, { method: 'POST', body: JSON.stringify(data) });
    }
    bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
    loadTasks();
}

async function deleteTask(id) {
    if (!confirm('Delete task?')) return;
    await apiFetch(`${API}/tasks/${id}/`, { method: 'DELETE' });
    loadTasks();
}

// ============ MEMBERS ============
let currentUserRole = null;

async function openMembersModal() {
    if (!selectedTeamId) return alert('Select a team first.');
    document.getElementById('addMemberForm').style.display = 'none';
    document.getElementById('membersList').innerHTML = '<p class="text-muted">Loading members...</p>';
    const modal = new bootstrap.Modal(document.getElementById('membersModal'));
    modal.show();
    await loadMembersList();
}

async function loadMembersList() {
    try {
        const members = await apiFetch(`${API}/teams/${selectedTeamId}/members/`);
        const container = document.getElementById('membersList');
        const me = members.find(m => m.user == getUserIdFromToken());
        currentUserRole = me ? me.role : null;
        
        if (currentUserRole === 'admin') {
            document.getElementById('addMemberForm').style.display = 'block';
        } else {
            document.getElementById('addMemberForm').style.display = 'none';
        }

        if (!members || members.length === 0) {
            container.innerHTML = '<p class="text-muted">No members.</p>';
            return;
        }
        container.innerHTML = members.map(m => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${m.username || m.user_email || `User ${m.user}`}</strong>
                    <span class="badge bg-secondary ms-2">${m.role}</span>
                </div>
                <div>
                    ${currentUserRole === 'admin' && m.user != getUserIdFromToken() ? `
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="changeRole(${m.id}, '${m.role === 'admin' ? 'member' : 'admin'}')">
                            ${m.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeMember(${m.id})">Remove</button>
                    ` : ''}
                </div>
            </div>`).join('');
    } catch (e) {
        console.error(e);
        document.getElementById('membersList').innerHTML = '<p class="text-danger">Failed to load members.</p>';
    }
}

async function addMember() {
    const userId = document.getElementById('newMemberId').value.trim();
    const role = document.getElementById('newMemberRole').value;
    if (!userId) return alert('Enter a user ID');
    try {
        await apiFetch(`${API}/teams/${selectedTeamId}/members/`, {
            method: 'POST',
            body: JSON.stringify({ user: parseInt(userId), role })
        });
        document.getElementById('newMemberId').value = '';
        loadMembersList();
        loadMembers(selectedTeamId);
    } catch (e) {
        alert(e.message);
    }
}

async function changeRole(membershipId, newRole) {
    try {
        await apiFetch(`${API}/teams/${selectedTeamId}/members/${membershipId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole })
        });
        loadMembersList();
    } catch (e) {
        alert(e.message);
    }
}

async function removeMember(membershipId) {
    if (!confirm('Remove this member?')) return;
    try {
        await apiFetch(`${API}/teams/${selectedTeamId}/members/${membershipId}/`, {
            method: 'DELETE'
        });
        loadMembersList();
        loadMembers(selectedTeamId);
    } catch (e) {
        alert(e.message);
    }
}

function getUserIdFromToken() {
    try {
        const payload = JSON.parse(atob(access.split('.')[1]));
        return payload.user_id;
    } catch (e) {
        return null;
    }
}

// ============ FILES ============
async function openFilesModal() {
    if (!selectedTeamId) return alert('Select a team first.');
    document.getElementById('filesList').innerHTML = '<p class="text-muted">Loading files...</p>';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').value = '';
    document.getElementById('fileDesc').value = '';
    const modal = new bootstrap.Modal(document.getElementById('filesModal'));
    modal.show();
    await loadFiles();
}

async function loadFiles() {
    try {
        const files = await apiFetch(`${API}/teams/${selectedTeamId}/files/`);
        const container = document.getElementById('filesList');
        if (!files || files.length === 0) {
            container.innerHTML = '<p class="text-muted">No files uploaded yet.</p>';
            return;
        }
        container.innerHTML = files.map(f => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${f.name || f.file.split('/').pop()}</strong>
                    <span class="text-muted ms-2">${f.description || ''}</span>
                </div>
                <div>
                    <a href="${f.file}" class="btn btn-sm btn-outline-primary me-1" target="_blank"><i class="bi bi-download"></i> Download</a>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFile(${f.id})"><i class="bi bi-trash"></i></button>
                </div>
            </div>`).join('');
    } catch (e) {
        console.error(e);
        document.getElementById('filesList').innerHTML = '<p class="text-danger">Failed to load files.</p>';
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const nameInput = document.getElementById('fileName').value.trim();
    const descInput = document.getElementById('fileDesc').value.trim();

    if (!fileInput.files.length) return alert('Please select a file.');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (nameInput) formData.append('name', nameInput);
    if (descInput) formData.append('description', descInput);

    try {
        const res = await fetch(`${API}/teams/${selectedTeamId}/files/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access}` },
            body: formData
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(Object.values(err).flat().join(' ') || 'Upload failed');
        }
        document.getElementById('fileInput').value = '';
        document.getElementById('fileName').value = '';
        document.getElementById('fileDesc').value = '';
        loadFiles();
    } catch (e) {
        alert(e.message);
    }
}

async function deleteFile(fileId) {
    if (!confirm('Delete this file?')) return;
    try {
        const res = await fetch(`${API}/teams/${selectedTeamId}/files/${fileId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${access}` }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(Object.values(err).flat().join(' ') || 'Delete failed');
        }
        loadFiles();
    } catch (e) {
        alert(e.message);
    }
}

// Initial load
loadTeams();