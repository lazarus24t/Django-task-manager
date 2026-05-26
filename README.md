# Task Manager – Team Collaboration API & Web App

A full-stack task management application built with Django REST Framework and a vanilla JavaScript frontend.  
It features team‑based task management, JWT authentication, role‑based access control, and a modern glassmorphism UI.

## 🚀 Features

- **User authentication** – register & login with JWT tokens (auto‑login after signup)
- **Teams** – create teams and automatically become admin
- **Membership management** – add/remove members, promote to admin, demote to member
- **Tasks CRUD** – create, read, update, delete tasks; assign to team members
- **Permission system** – only team members can access team tasks; admins manage the roster
- **REST API** – fully documented with Swagger UI (`/swagger/`)
- **Modern UI** – glassmorphism design, dark sidebar, modals, responsive layout
- **Separation of concerns** – HTML, CSS, JS split into static files

## 🛠️ Tech Stack

- **Backend:** Django 6.0, Django REST Framework, Simple JWT
- **Frontend:** Vanilla JavaScript, Bootstrap 5, Bootstrap Icons
- **Database:** SQLite (development), ready for PostgreSQL
- **API Docs:** drf-yasg (Swagger / ReDoc)

## ⚙️ Getting Started

### Prerequisites
- Python 3.10+
- pip

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/taskmanager.git
   cd taskmanager