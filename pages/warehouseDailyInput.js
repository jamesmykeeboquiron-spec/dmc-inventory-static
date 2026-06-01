.warehouse-daily-input-toolbar {
  display: grid;
  grid-template-columns: 180px 220px minmax(240px, 1fr) 240px;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.025);
  border-radius: 22px;
}

.warehouse-daily-input-toolbar label {
  display: grid;
  gap: 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.warehouse-daily-input-toolbar input,
.warehouse-daily-input-toolbar select {
  height: 44px;
}

.warehouse-daily-input-cell {
  min-width: 84px;
}

@media (max-width: 900px) {
  .warehouse-daily-input-toolbar {
    grid-template-columns: 1fr;
  }
}
