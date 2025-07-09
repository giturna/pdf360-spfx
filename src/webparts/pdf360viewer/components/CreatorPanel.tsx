import * as React from 'react';
import styles from './Pdf360Viewer.module.scss';
import { Dropdown, IDropdownOption } from '@fluentui/react';

export interface ICreatorPanelProps {
  /* ------------------- state ------------------- */
  projectName: string;
  saving: boolean;
  showCreateForm: boolean;
  showLoadForm: boolean;
  newPdfFile: File | null;
  newImageFile: File | null;
  projects: IDropdownOption[];
  selectedProjectId?: number;
  status: string;
  newIconTitle: string;

  /* ---------------- callbacks ------------------ */
  onToggleCreateForm: () => void;
  onToggleLoadForm: () => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateProject: () => Promise<void>;
  onProjectChange: (_: any, o?: IDropdownOption) => void;
  onDeleteProject: () => Promise<void>;
  onNewPdfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPdf: () => Promise<void>;
  onNewImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddIcon: () => Promise<void>;
  onIconTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CreatorPanel: React.FC<ICreatorPanelProps> = ({
  projectName,
  saving,
  showCreateForm,
  showLoadForm,
  newPdfFile,
  newImageFile,
  projects,
  selectedProjectId,
  onToggleCreateForm,
  onToggleLoadForm,
  onNameChange,
  onFileChange,
  onCreateProject,
  onProjectChange,
  onDeleteProject,
  onNewPdfChange,
  onUploadPdf,
  onNewImageChange,
  onAddIcon,
  newIconTitle,
  onIconTitleChange
}) => {
  return (
    <div className={styles.creatorPane}>
      {/* ---------- Neues Projekt erstellen ---------- */}
      <button
        className={styles.button}
        onClick={onToggleCreateForm}
        disabled={saving}
        style={{ marginBottom: 12 }}
      >
        {showCreateForm ? '▾ Neues Projekt erstellen' : '▸ Neues Projekt erstellen'}
      </button>

      {showCreateForm && (
        <>
          <label>Projekt Name</label>
          <input
            type="text"
            value={projectName}
            onChange={onNameChange}
            disabled={saving}
            className={styles.textInput}
          />

          <label>Plan auswählen</label>
          <input
            type="file"
            accept=".pdf"
            onChange={onFileChange}
            disabled={saving}
          />

          <button
            className={styles.button}
            style={{ backgroundColor: '#78c431' }}
            onClick={onCreateProject}
            disabled={saving}
          >
            {saving ? 'Wird gespeichert…' : 'Erstellen'}
          </button>
        </>
      )}

      {/* ---------- Bestehendes Projekt laden ---------- */}
      <button
        className={styles.button}
        onClick={onToggleLoadForm}
        disabled={saving}
        style={{ marginBottom: 12 }}
      >
        {showLoadForm ? '▾ Bestehendes Projekt laden' : '▸ Bestehendes Projekt laden'}
      </button>

      {showLoadForm && (
        <>
          <label style={{ marginTop: 24 }}>Projekt laden</label>
          <Dropdown
            placeholder="Projekt auswählen"
            options={projects}
            onChange={onProjectChange}
            disabled={saving}
          />

          {selectedProjectId && (
            <button
              className={styles.deleteProjBtn}
              onClick={onDeleteProject}
              disabled={saving}
            >
              Projekt löschen
            </button>
          )}

          {/* -------- Weitere PDF hinzufügen -------- */}
          <div className={styles.sectionHr} />
          <label>Weitere Pläne hinzufügen</label>
          <div className={styles.inlineRow}>
            <input
              type="file"
              accept=".pdf"
              onChange={onNewPdfChange}
              disabled={saving}
            />
            <br />
            <button
              className={styles.smallBtn}
              onClick={onUploadPdf}
              disabled={saving || !newPdfFile}
            >
              Hinzufügen
            </button>
          </div>

          {/* -------- 360° Bild + Icon -------- */}
          <label>360°‑Bild mit neuem Icon hinzufügen</label>
          <label>Icon-Titel (optional)</label>
          <input
            type="text"
            value={newIconTitle}
            onChange={onIconTitleChange}
            className={styles.textInput}
          />
          <div className={styles.inlineRow}>
            <input
              type="file"
              accept="image/*"
              onChange={onNewImageChange}
              disabled={saving}
            />
            <br />
            <button
              className={styles.smallBtn}
              onClick={onAddIcon}
              disabled={saving || !newImageFile}
            >
              Icon hinzufügen
            </button>
          </div>
        </>
      )}

      {/* ---------- Hilfe ---------- */}
      <button
        className={styles.button}
        onClick={() => window.location.reload()}
      >
        Hilfe
      </button>
    </div>
  );
};

export default CreatorPanel;
