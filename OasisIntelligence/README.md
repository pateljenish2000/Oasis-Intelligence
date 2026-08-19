# Oasis Intelligence (FastAPI + React Stack)

A modern agricultural and macroeconomic data exploration platform powered by **FastAPI (Python)** and **React + TypeScript (Vite)**.

## Quickstart

You can start both the backend API and frontend application with a single command:

### Linux / macOS
```bash
./start-project.sh
```

### Windows
Double-click `start-project.bat` or run:
```cmd
start-project.bat
```

---

## Service Endpoints

- **Frontend App**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## Project Structure

- `backend/`: FastAPI application (`app/main.py` & `app/db.py`) connected to Google Cloud SQL MySQL using `cloud-sql-python-connector`.
- `frontend/`: Single-page React application providing live exploratory filtering, Chart.js visualizations, and bookmarking.
- `secrets/`: Local directory (`backend/secrets/`) containing `db.properties` and `service-account.json`.
