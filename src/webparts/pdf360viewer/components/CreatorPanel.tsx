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

  showIconPanel: boolean;
  onToggleIconPanel: () => void;

  /* --- folders --- */
  showFolderPanel: boolean;
  onToggleFolderPanel: () => void;
  subfolders: IDropdownOption[];
  selectedSubfolder?: string;
  folderNameInput: string;
  onFolderNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateSubfolder: () => Promise<void>;
  onSubfolderChange: (_: any, o?: IDropdownOption) => void;

  folderRenameInput: string;
  onFolderRenameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenameSubfolder: () => Promise<void>;
  onDeleteSubfolder: () => Promise<void>;

  projectRenameInput: string;
  onProjectRenameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenameProject: () => Promise<void>;
  showProjectRenamePanel: boolean;
  onToggleProjectRenamePanel: () => void;

  showAddPdfPanel: boolean;
  onToggleAddPdfPanel: () => void;
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
  onIconTitleChange,
  showIconPanel,
  onToggleIconPanel,
  showFolderPanel,
  onToggleFolderPanel,
  subfolders,
  selectedSubfolder,
  folderNameInput,
  onFolderNameChange,
  onCreateSubfolder,
  onSubfolderChange,

  folderRenameInput,
  onFolderRenameChange,
  onRenameSubfolder,
  onDeleteSubfolder,

  projectRenameInput,
  onProjectRenameChange,
  onRenameProject,
  showProjectRenamePanel,
  onToggleProjectRenamePanel,

  showAddPdfPanel,
  onToggleAddPdfPanel
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
          <label>Projekt Name</label>
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

          {/* --- Projekt umbenennen --- */}
          <button
            className={styles.button}
            onClick={onToggleProjectRenamePanel}
            disabled={saving || !selectedProjectId}
            style={{ marginTop: 12, marginBottom: 8 }}
          >
            {showProjectRenamePanel ? '▾ Projekt umbenennen' : '▸ Projekt umbenennen'}
          </button>

          {showProjectRenamePanel && (
            <>
              <div className={styles.inlineRow}>
                <input
                  type="text"
                  value={projectRenameInput}
                  onChange={onProjectRenameChange}
                  disabled={saving || !selectedProjectId}
                  className={styles.textInput}
                  placeholder="Neuer Projektname"
                />
                <button
                  className={styles.smallBtn}
                  onClick={onRenameProject}
                  disabled={saving || !selectedProjectId || !projectRenameInput.trim()}
                >
                  Umbenennen
                </button>
              </div>
            </>
          )}

          {selectedProjectId && (
            <button
              className={styles.deleteProjBtn}
              onClick={onDeleteProject}
              disabled={saving}
            >
              Projekt löschen
            </button>
          )}

          {/* -------- Ordner & Unterordner -------- */}
          <div className={styles.sectionHr} />
          <button
            className={styles.button}
            onClick={onToggleFolderPanel}
            disabled={saving}
            style={{ marginBottom: 12 }}
          >
            {showFolderPanel ? '▾ Ordner & Unterordner' : '▸ Ordner & Unterordner'}
          </button>

          {showFolderPanel && (
            <>
              {/* Unterordner auswählen */}
              <label style={{ marginTop: 12 }}>Unterordner wählen</label>
              <Dropdown
                placeholder="Home-Ordner"
                options={subfolders}
                onChange={onSubfolderChange}
                disabled={saving}
                selectedKey={selectedSubfolder ?? ''}
              />

              {/* Unterordner erstellen */}
              <label>Unterordner erstellen</label>
              <div className={styles.inlineRow}>
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={onFolderNameChange}
                  disabled={saving}
                  className={styles.textInput}
                  placeholder="z. B. EG, 1.OG, Technik…"
                />
                <button
                  className={styles.smallBtn}
                  onClick={onCreateSubfolder}
                  disabled={saving || !folderNameInput.trim()}
                >
                  Erstellen
                </button>
              </div>

              {/* --- Umbenennen --- */}
              <label style={{ marginTop: 8 }}>Unterordner umbenennen</label>
              <div className={styles.inlineRow}>
                <input
                  type="text"
                  value={folderRenameInput}
                  onChange={onFolderRenameChange}
                  disabled={saving || (selectedSubfolder ?? '') === ''}
                  className={styles.textInput}
                  placeholder="Neuer Name"
                />
                <button
                  className={styles.smallBtn}
                  onClick={onRenameSubfolder}
                  disabled={saving || (selectedSubfolder ?? '') === '' || !folderRenameInput.trim()}
                >
                  Umbenennen
                </button>
              </div>

              {/* --- Löschen --- */}
              <button
                className={styles.deleteProjBtn}
                style={{ marginTop: 8 }}
                onClick={onDeleteSubfolder}
                disabled={saving || (selectedSubfolder ?? '') === ''}
                title="Ausgewählten Unterordner samt Inhalt löschen"
              >
                Unterordner löschen
              </button>
            </>
          )}

          {/* -------- Weitere Pläne hinzufügen -------- */}
          <div className={styles.sectionHr} />
          <button
            className={styles.button}
            onClick={onToggleAddPdfPanel}
            disabled={saving}
            style={{ marginBottom: 12 }}
          >
            {showAddPdfPanel ? '▾ Weitere Pläne hinzufügen' : '▸ Weitere Pläne hinzufügen'}
          </button>

          {showAddPdfPanel && (
            <>
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
            </>
          )}


          {/* -------- 360° Bild + Icon -------- */}
          <div className={styles.sectionHr} />
          <button
            className={styles.button}
            onClick={onToggleIconPanel}
            disabled={saving}
            style={{ marginBottom: 12 }}
          >
            {showIconPanel ? '▾ 360 Bild mit neuem Icon hinzufügen' : '▸ 360 Bild mit neuem Icon hinzufügen'}
          </button>

          {showIconPanel && (
            <>
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
                  Icon hinzufügen
                </button>
              </div>
            </>
          )}
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
