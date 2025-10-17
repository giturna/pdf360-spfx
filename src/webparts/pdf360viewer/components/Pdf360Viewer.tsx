import * as React from 'react';
import styles from './Pdf360Viewer.module.scss';
import type { IPdf360ViewerProps } from './IPdf360ViewerProps';
import CreatorPanel from './CreatorPanel';
import PdfCanvas from './PdfCanvas';
import IconModal from './IconModal';
import { IconManager } from './IconManager';
import * as Del from './DeleteHelpers';

// Dokumentation
import DefaultHelpDE from './DefaultHelpDE';

// 360° bild und modal
import 'photo-sphere-viewer/dist/photo-sphere-viewer.css';

// PnP JS
import { spfi, SPFx, SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';

// Fluent UI
import { IDropdownOption } from '@fluentui/react';

// PDF.js 2.x
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

// Gleiche die Worker-Versionen mit der API auf 2.16.105 ab
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

interface IState {
  projects: IDropdownOption[];
  pdfBuffer: ArrayBuffer | null;
  selectedProjectId?: number;
  selectedProjectName?: string;
  currentPdfItemId?: number;

  projectName: string;
  pdfFile: File | null;

  projectDocs: { FileRef: string; FileLeafRef: string }[];
  newPdfFile: File | null;

  newImageFile: File | null;
  icons: Array<{
    iconLocId: number;
    xPercent: number;
    yPercent: number;
    imageUrl: string;
    title: string;
  }>;
  newIconTitle: string;

  isModalOpen: boolean;
  modalImageUrl: string | null;

  dragIconId?: number;
  containerRect?: DOMRect;
  didDrag?: boolean;

  showTrash?: boolean;
  trashHover?: boolean;
  longPressTimer?: number;

  currentIconId?: number;
  iconImages: Array<{
    imgItemId: number;
    imageFileId: number;
    url: string;
    fileName: string;
  }>;
  uploadingImage?: File | null;

  status: string;
  saving: boolean;

  showCreateForm: boolean;
  showLoadForm: boolean;

  // folders
  showFolderPanel: boolean;
  showIconPanel: boolean;
  subfolders: IDropdownOption[];     // key: string ('' = wurzel); text: angezeigte Name
  selectedSubfolder?: string;        // '' oder undefined = wurzel
  folderNameInput: string;
  folderRenameInput: string;

  projectRenameInput: string;
  showProjectRenamePanel: boolean;
  showAddPdfPanel: boolean;
  showRenamePlansPanel: boolean;
  planNameEdits: Record<string, string>;
}

export default class Pdf360Viewer extends React.Component<IPdf360ViewerProps, IState> {

  public _sp!: SPFI;
  public _docLibUrl!: string;
  private _icons!: IconManager;
  private _canvasWrapRef = React.createRef<HTMLDivElement>();
  private _trashRef      = React.createRef<HTMLDivElement>();
  private _deleteIconImage!: typeof Del.deleteIconImage;
  private _deleteCurrentPdf!: typeof Del.deleteCurrentPdf;
  private _deleteCurrentProject!: typeof Del.deleteCurrentProject;
  private _currentPdfRender?: pdfjsLib.RenderTask;
  private _deleteCurrentSubfolder!: typeof Del.deleteCurrentSubfolder;

  constructor(props: IPdf360ViewerProps) {
    super(props);
    this._sp = spfi().using(SPFx(this.props.context));
    this._deleteIconImage      = Del.deleteIconImage.bind(this);
    this._deleteCurrentPdf     = Del.deleteCurrentPdf.bind(this);
    this._deleteCurrentProject = Del.deleteCurrentProject.bind(this);
    this._deleteCurrentSubfolder = Del.deleteCurrentSubfolder.bind(this);
    const webRel = this.props.context.pageContext.web.serverRelativeUrl;
    this._docLibUrl = `${webRel}/Shared Documents`; // 'Freigegebene Dokumente' oder 'Shared Documents' (Hängt von der Site-Sprache ab)
    
    this.state = {
      projects: [],
      pdfBuffer: null,
      selectedProjectId: undefined,
      selectedProjectName: undefined,
      currentPdfItemId: undefined,

      projectName: '',
      pdfFile: null,

      projectDocs: [],
      newPdfFile: null,

      newImageFile: null,
      icons: [],
      newIconTitle: '',

      isModalOpen: false,
      modalImageUrl: null,

      dragIconId: undefined,
      containerRect: undefined,
      didDrag: undefined,

      showTrash: undefined,
      trashHover: undefined,
      longPressTimer: undefined,

      currentIconId: undefined,
      iconImages: [],
      uploadingImage: null,

      status: '',
      saving: false,

      showCreateForm: false,
      showLoadForm: false,

      // folders
      showFolderPanel: false,
      showIconPanel: false,
      subfolders: [],
      selectedSubfolder: '',
      folderNameInput: '',
      folderRenameInput: '',

      projectRenameInput: '',
      showProjectRenamePanel: false,
      showAddPdfPanel: false,
      showRenamePlansPanel: false,
      planNameEdits: {},
    };

    this._icons = new IconManager({
      sp:            this._sp,
      docLibUrl:     this._docLibUrl,
      canvasWrapRef: this._canvasWrapRef,
      trashRef:      this._trashRef,
      getState:      () => this.state,
      setState:      this.setState.bind(this)
    });
  }

  private _currentFolderPath(projectName: string, subfolder?: string): string {
    const base = `${this._docLibUrl}/${projectName}`;
    const key  = (subfolder ?? this.state.selectedSubfolder ?? '').trim();
    const sub  = key ? `/${key}` : '';
    return `${base}${sub}`;
  }

  private _subfolderStorageKey(projectName: string): string {
    return `Pdf360Viewer.subfolder.${projectName}`;
  }


  private _debounce<T extends (...a:any)=>void>(fn:T, ms=0) {
    let t: number;
    return (...args: Parameters<T>) => {
      clearTimeout(t);
      t = window.setTimeout(() => fn(...args), ms);
    };
  }

  private _onWinResize = this._debounce(() => {
    const { pdfBuffer } = this.state;
    if (pdfBuffer) {
      this._renderPdf(pdfBuffer);
    }
  }, 150);


  public async componentDidMount(): Promise<void>{
    window.addEventListener('resize', this._onWinResize);
    try {
      const raw = await this._sp.web.lists
        .getByTitle('Projekte')
        .items
        .select('ID','Title')
        .orderBy('Title')();
      const opts = (raw as any[]).map(p => ({ key: p.ID, text: p.Title }));
      this.setState({ projects: opts });
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `Fehler beim Laden der Projekte: ${e.message}` });
    }
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this._onWinResize);
  }


  private _loadProjectDocs = async (
    projectName: string,
    subfolder?: string
  ): Promise<{ FileRef:string; FileLeafRef:string }[]> => {

    const folderPath = this._currentFolderPath(projectName, subfolder);
    const files = await this._sp.web
      .getFolderByServerRelativePath(folderPath)
      .files();

    return (files as any[])
      .filter(f => f.Name.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        FileRef:     f.ServerRelativeUrl,
        FileLeafRef: f.Name
      }));
  };

  private _loadSubfolders = async (projectName: string): Promise<IDropdownOption[]> => {
    const basePath = `${this._docLibUrl}/${projectName}`;
    const folders = await this._sp.web
      .getFolderByServerRelativePath(basePath)
      .folders();

    // Option „(Wurzel)“ + Unterordner
    const opts: IDropdownOption[] = [
      { key: '', text: '(Home-Ordner)' },
      ...((folders as any[]) || []).map(f => ({ key: f.Name as string, text: f.Name as string })),
    ];
    this.setState({ subfolders: opts });
    return opts;
  };
  
  
  public _loadIconsForPdf = async (pdfItemId?: number): Promise<void> => {
    if (!pdfItemId) return;
    await this._icons.loadIconsForPdf(pdfItemId);
  };


  private _onProjectChange = async (_: any, o?: IDropdownOption): Promise<void> => {
    if (!o) return;
    const projectId   = o.key as number;
    const projectName = o.text;
  
    // 1) Aktualisiere den State: ausgewählte Projektinformation + Ladehinweis
    this.setState({
      selectedProjectId:   projectId,
      selectedProjectName: projectName,
      projectRenameInput:  projectName,
      status:              '⏳ PDF wird geladen…'
    });
  
    // Unterordner einbinden und mit Wurzel beginnen
    await this._loadSubfolders(projectName);
    this.setState({ selectedSubfolder: '' });
    // Wenn ein gespeicherter Unterordner vorhanden ist, dort beginnen
    const savedSub = localStorage.getItem(this._subfolderStorageKey(projectName)) || '';
    if (savedSub) {
      this.setState({ selectedSubfolder: savedSub });
      // Lade die PDFs aus diesem Ordner, indem du die Dropdown-Auswahl simulierst
      await this._onSubfolderChange(null as any, { key: savedSub, text: savedSub } as any);
      return; // Überspringe den Ladevorgang vom Stammverzeichnis
    }
    try {
      
      // 2) Der Pfad zum projektbezogenen Ordner
      const folderPath = `${this._docLibUrl}/${projectName}`;
  
      // 3) Alle Dateien im Ordner abrufen
      const files = await this._sp.web
        .getFolderByServerRelativePath(folderPath)
        .files();
  
      // 4) Nur die Dateien mit der Endung .pdf filtern
      const pdfFiles = files.filter(f => f.Name.toLowerCase().endsWith('.pdf'));
  
      if (pdfFiles.length === 0) {
        // Wenn keine PDF vorhanden ist, den State zurücksetzen und den Benutzer benachrichtigen
        this.setState({
          projectDocs: [],
          pdfBuffer:   null,
          status:      '⚠️ In diesem Projekt sind noch keine PDFs vorhanden.'
        });
        return;
      }
  
      // 5) Den projectDocs-State aktualisieren (für die Button-Liste)
      const docsState = pdfFiles.map(f => ({
        FileRef:     f.ServerRelativeUrl,
        FileLeafRef: f.Name
      }));
      this.setState({ projectDocs: docsState });
  
      // 6) Die erste PDF herunterladen und auf das Canvas zeichnen
      const firstRef = pdfFiles[0].ServerRelativeUrl;
      const buf      = await this._sp.web.getFileByServerRelativePath(firstRef).getBuffer();
      this.setState({ pdfBuffer: buf, status: '' });
      await this._renderPdf(buf);

      // Die itemId der PDF abrufen
      const pdfItem = await this._sp.web
        .getFileByServerRelativePath(firstRef)
        .getItem<{ Id: number }>('Id');
      const { Id: pdfItemId } = await pdfItem();
      this.setState({ currentPdfItemId: pdfItemId });

      // Auch die Icons im Projekt laden
      await this._icons.loadIconsForPdf(pdfItemId);
  
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Fehler beim Laden der PDF: ${e.message}` });
    }
  };


  private _createSubfolder = async (): Promise<void> => {
    const { selectedProjectName, folderNameInput } = this.state;
    if (!selectedProjectName || !folderNameInput.trim()) return;

    this.setState({ saving: true, status: 'Ordner wird erstellt…' });
    try {
      const parent = `${this._docLibUrl}/${selectedProjectName}`;
      await this._sp.web
        .getFolderByServerRelativePath(parent)
        .folders.addUsingPath(folderNameInput.trim());

      await this._loadSubfolders(selectedProjectName);
      this.setState({ status: '✅ Ordner erstellt.', folderNameInput: '' });
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Ordner konnte nicht erstellt werden: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };

  private _onSubfolderChange = async (_: any, o?: IDropdownOption): Promise<void> => {
    if (!o) return;
    const folderKey = (o.key as string) ?? '';
    const { selectedProjectName } = this.state;
    if (!selectedProjectName) return;

    // Persistieren
    localStorage.setItem(this._subfolderStorageKey(selectedProjectName), folderKey);

    // Statusanzeige und Symbole löschen
    this.setState({
      selectedSubfolder: folderKey,
      folderRenameInput: folderKey,
      status: '⏳ PDF wird geladen…',
      icons: []
    });

    try {
      const docs = await this._loadProjectDocs(selectedProjectName, folderKey);
      this.setState({ projectDocs: docs });

      if (docs.length === 0) {
        this.setState({
          pdfBuffer: null,
          currentPdfItemId: undefined,
          status: '⚠️ Dieser Ordner enthält keine PDFs.'
        });
        return;
      }

      const firstRef = docs[0].FileRef;
      const buf = await this._sp.web.getFileByServerRelativePath(firstRef).getBuffer();
      this.setState({ pdfBuffer: buf, status: '' });
      await this._renderPdf(buf);

      const pdfItem = await this._sp.web
        .getFileByServerRelativePath(firstRef)
        .getItem<{ Id: number }>('Id');
      const { Id: pdfItemId } = await pdfItem();
      this.setState({ currentPdfItemId: pdfItemId });

      await this._icons.loadIconsForPdf(pdfItemId);
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Fehler beim Laden der PDF: ${e.message}` });
    }
  };


  private _renameCurrentSubfolder = async (): Promise<void> => {
    const { selectedProjectName, selectedSubfolder, folderRenameInput } = this.state;
    const oldName = (selectedSubfolder ?? '').trim();
    const newName = (folderRenameInput ?? '').trim();

    if (!selectedProjectName || !oldName) {
      this.setState({ status: '❗ Bitte zuerst einen Unterordner wählen.' });
      return;
    }
    if (!newName || newName === oldName) {
      this.setState({ status: '❗ Neuer Name ist leer oder unverändert.' });
      return;
    }

    this.setState({ saving: true, status: `Unterordner wird umbenannt… (${oldName} → ${newName})` });
    try {
      const base = `${this._docLibUrl}/${selectedProjectName}`;
      const oldPath = `${base}/${oldName}`;
      const newPath = `${base}/${newName}`;

      await this._sp.web.getFolderByServerRelativePath(oldPath).moveByPath(newPath);

      // Liste aktualisieren und Auswahl sowie localStorage auf den neuen Namen übertragen
      await this._loadSubfolders(selectedProjectName);
      localStorage.setItem(this._subfolderStorageKey(selectedProjectName), newName);

      this.setState({
        selectedSubfolder: newName,
        folderRenameInput: newName,
        status: '✅ Unterordner wurde umbenannt.'
      });

      // Wenn die PDFs aus diesem Ordner aufgelistet sind, erneut laden
      const docs = await this._loadProjectDocs(selectedProjectName, newName);
      this.setState({ projectDocs: docs });

    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Umbenennen fehlgeschlagen: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };


  private _renameCurrentProject = async (): Promise<void> => {
    const { selectedProjectId, selectedProjectName, projectRenameInput } = this.state;
    const oldName = (selectedProjectName ?? '').trim();
    const newName = (projectRenameInput ?? '').trim();

    if (!selectedProjectId || !oldName) {
      this.setState({ status: '❗ Bitte zuerst ein Projekt laden.' });
      return;
    }
    if (!newName || newName === oldName) {
      this.setState({ status: '❗ Neuer Projektname ist leer oder unverändert.' });
      return;
    }

    this.setState({ saving: true, status: `Projekt wird umbenannt… (${oldName} → ${newName})` });
    try {
      // 1) Liste: Title updaten
      await this._sp.web.lists.getByTitle('Projekte')
        .items.getById(selectedProjectId).update({ Title: newName });

      // 2) Ordner: moveByPath
      const oldPath = `${this._docLibUrl}/${oldName}`;
      const newPath = `${this._docLibUrl}/${newName}`;
      await this._sp.web.getFolderByServerRelativePath(oldPath).moveByPath(newPath);

      // 3) localStorage anahtarını taşı
      const oldKey = this._subfolderStorageKey(oldName);
      const newKey = this._subfolderStorageKey(newName);
      const savedSub = localStorage.getItem(oldKey);
      if (savedSub !== null) {
        localStorage.removeItem(oldKey);
        localStorage.setItem(newKey, savedSub);
      }

      // 4) Dropdown seçeneklerini ve seçimi güncelle
      this.setState(prev => ({
        projects: prev.projects.map(p => p.key === selectedProjectId ? { ...p, text: newName } : p),
        selectedProjectName: newName,
        status: '✅ Projekt wurde umbenannt.'
      }));

      // 5) Alt klasör listesini ve PDF’leri yeni isimden yükle
      await this._loadSubfolders(newName);
      const startSub = savedSub ?? '';
      this.setState({ selectedSubfolder: startSub, folderRenameInput: startSub });

      const docs = await this._loadProjectDocs(newName, startSub || undefined);
      this.setState({ projectDocs: docs });

      if (docs.length) {
        const firstRef = docs[0].FileRef;
        const buf = await this._sp.web.getFileByServerRelativePath(firstRef).getBuffer();
        this.setState({ pdfBuffer: buf, status: '' });
        await this._renderPdf(buf);

        const pdfItem = await this._sp.web.getFileByServerRelativePath(firstRef).getItem<{ Id:number }>('Id');
        const { Id } = await pdfItem();
        this.setState({ currentPdfItemId: Id });
        await this._icons.loadIconsForPdf(Id);
      } else {
        this.setState({ pdfBuffer: null, currentPdfItemId: undefined });
      }

    } catch (e:any) {
      console.error(e);
      this.setState({ status: `🚫 Umbenennen fehlgeschlagen: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };



  private _saveRenamedPlans = async (): Promise<void> => {
    const { selectedProjectName, selectedSubfolder, projectDocs, planNameEdits } = this.state;
    if (!selectedProjectName) return;

    // Hedef klasör yolu
    const folderPath = this._currentFolderPath(selectedProjectName, selectedSubfolder);

    // Değişenleri belirle
    const changes = projectDocs
      .map(d => ({
        fileRef: d.FileRef,
        oldName: d.FileLeafRef,
        newName: (planNameEdits[d.FileRef] ?? d.FileLeafRef).trim()
      }))
      .filter(x => x.newName && x.newName !== x.oldName);

    if (changes.length === 0) {
      this.setState({ status: 'Keine Änderungen.' });
      return;
    }

    // Basit uzantı koruması: .pdf yoksa ekle
    const ensurePdf = (name: string) =>
      name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;

    this.setState({ saving: true, status: 'Pläne werden umbenannt…' });
    try {
      for (const ch of changes) {
        const target = `${folderPath}/${ensurePdf(ch.newName)}`;
        await this._sp.web
          .getFileByServerRelativePath(ch.fileRef)
          .moveByPath(target, true); // aynı klasörde yeni ada taşı (rename)
      }

      // Listeyi tazele
      const docs = await this._loadProjectDocs(selectedProjectName, selectedSubfolder || undefined);
      this.setState({
        projectDocs: docs,
        status: '✅ Umbenennung abgeschlossen.'
      });

      // Panel açık kalsın ama yeni isimlerle inputları güncelle
      const map: Record<string,string> = {};
      for (const d of docs) map[d.FileRef] = d.FileLeafRef;
      this.setState({ planNameEdits: map });

    } catch (e:any) {
      console.error(e);
      this.setState({ status: `🚫 Umbenennen fehlgeschlagen: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };



  private _closeModal = (): void => {
    this.setState({ isModalOpen: false, modalImageUrl: null });
  }


  private async _renderPdf(data: ArrayBuffer): Promise<void> {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf  = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const container = this._canvasWrapRef.current;
    if (!container) return;

    const targetWidth = container.clientWidth;
    const unscaled = page.getViewport({ scale: 1 });
    const scale    = targetWidth / unscaled.width;
    const vp   = page.getViewport({ scale });

    const c    = document.getElementById('pdfCanvas') as HTMLCanvasElement;
    const ctx  = c.getContext('2d')!;

    c.width  = vp.width;
    c.height = vp.height;

    // Falls eine vorherige Renderung vorhanden ist, abbrechen
    if (this._currentPdfRender) {
      try { this._currentPdfRender.cancel(); } catch {}
    }

    const renderTask = page.render({ canvasContext: ctx, viewport: vp });
    this._currentPdfRender = renderTask;

    try {
      await renderTask.promise; // Wenn abgebrochen wird, wird hier ein Fehler ausgelöst
    } catch (e) {
      // Abbruch ist ein erwarteter Zustand, still überspringen
    } finally {
      if (this._currentPdfRender === renderTask) {
        this._currentPdfRender = undefined;
      }
      this._canvasWrapRef.current!.style.height = `${vp.height}px`;
    }
  }

  private _onNameChange = (e:React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ projectName: e.target.value });
  }
  private _onFileChange = (e:React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ pdfFile: e.target.files?.[0]||null });
  }
  private _onNewPdfChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ newPdfFile: e.target.files?.[0] || null });
  }
  private _onNewIconImage = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ uploadingImage: e.target.files?.[0] ?? null });
  };
  private _onIconTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ newIconTitle: e.target.value })
  };
  private _onFolderNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ folderNameInput: e.target.value });
  };
  private _onProjectRenameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ projectRenameInput: e.target.value });
  };
  private _onNewImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ newImageFile: e.target.files?.[0] ?? null });
  }
  private _onFolderRenameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ folderRenameInput: e.target.value });
  };
  private _onPlanNameEditChange = (fileRef: string, newName: string): void => {
    this.setState(prev => ({
      planNameEdits: { ...prev.planNameEdits, [fileRef]: newName }
    }));
  };


  private _uploadPdfToProject = async (): Promise<void> => {
    const { selectedProjectId, selectedProjectName, newPdfFile } = this.state;
    if (!selectedProjectId || !selectedProjectName || !newPdfFile) {
      this.setState({ status: '❗ Bitte wählen Sie zuerst ein Projekt aus und laden Sie eine PDF-Datei hoch.' });
      return;
    }
  
    this.setState({ saving: true, status: 'Wird geladen…' });
    try {
      // Zielordnerpfad: „Freigegebene Dokumente/Projektname“
      const folderPath = this._currentFolderPath(selectedProjectName);
  
      // 1) Die PDF-Datei in den entsprechenden Projektordner hochladen
      const fileRes = await this._sp.web
        .getFolderByServerRelativePath(folderPath)
        .files.addUsingPath(newPdfFile.name, newPdfFile, { Overwrite: true });
  
      // 2) Nur die FileType-Metadaten aktualisieren
      const item = await fileRes.file.getItem();
      await item.update({
        FileType: 'PDF'
      });
  
      // 3) Die PDF-Liste des Projekts aktualisieren und den Benutzer benachrichtigen
      const docs = await this._loadProjectDocs(selectedProjectName);
      this.setState({
        status: '✅ PDF wurde erfolgreich hinzugefügt.',
        newPdfFile: null,
        projectDocs: docs
      });
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Fehler beim Hochladen der PDF: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };
  
  
  /* Formular öffnen / schließen */
  private _toggleCreateForm = (): void => {
    this.setState(prev => ({ showCreateForm: !prev.showCreateForm }));
  };
  private _toggleLoadForm = (): void => {
    this.setState(prev => ({ showLoadForm: !prev.showLoadForm }));
  };
  private _toggleFolderPanel = (): void => {
    this.setState(prev => ({ showFolderPanel: !prev.showFolderPanel }));
  };
  private _toggleIconPanel = (): void => {
    this.setState(prev => ({ showIconPanel: !prev.showIconPanel }));
  };
  private _toggleProjectRenamePanel = (): void => {
    this.setState(prev => ({ showProjectRenamePanel: !prev.showProjectRenamePanel }));
  };
  private _toggleAddPdfPanel = (): void => {
    this.setState(prev => ({ showAddPdfPanel: !prev.showAddPdfPanel }));
  };
  private _toggleRenamePlansPanel = (): void => {
    this.setState(prev => {
      const willOpen = !prev.showRenamePlansPanel;
      const next: Partial<IState> = { showRenamePlansPanel: willOpen };
      if (willOpen) {
        // panel açılırken mevcut PDF listesine göre edit haritasını hazırla
        const map: Record<string, string> = {};
        for (const d of prev.projectDocs) map[d.FileRef] = d.FileLeafRef;
        next.planNameEdits = map;
      }
      return next as any;
    });
  };


  private _createProject = async (): Promise<void> => {
    const { projectName, pdfFile } = this.state;
    if (!projectName || !pdfFile) {
      this.setState({ status: '❗ Projektname und Plan auswählen.' });
      return;
    }
  
    this.setState({ saving: true, status: 'Wird gespeichert…' });
  
    try {
      // 1) In die Projects-Liste eintragen (wenn keine ID benötigt wird, keine Zuweisung vornehmen)
      await this._sp.web
        .lists.getByTitle('Projekte')
        .items.add({ Title: projectName });
  
      // 2) Einen Projektordner in der Dokumentenbibliothek erstellen
      await this._sp.web
        .getFolderByServerRelativePath(this._docLibUrl)
        .folders.addUsingPath(projectName);
  
      // 3) Die PDF-Datei in den neuen Ordner hochladen
      const fileRes = await this._sp.web
        .getFolderByServerRelativePath(`${this._docLibUrl}/${projectName}`)
        .files.addUsingPath(pdfFile.name, pdfFile, { Overwrite: true });
  
      // 4) Nur die FileType-Metadaten aktualisieren
      const item = await fileRes.file.getItem();
      await item.update({ FileType: 'PDF' });
  
      // 5) Benachrichtigung anzeigen, Formular zurücksetzen und Projekte erneut laden
      this.setState({
        status: '✅ Projekt wurde erfolgreich erstellt.',
        projectName: '',
        pdfFile: null
      });
      await this.componentDidMount();
  
    } catch (e: any) {
      console.error(e);
      this.setState({ status: `🚫 Fehler: ${e.message}` });
    } finally {
      this.setState({ saving: false });
    }
  };


  private _onPdfSelect = async (fileRef: string): Promise<void> => {
    this.setState({ status: '⏳ PDF wird geladen…', icons: [] }); // Alte Icons entfernen
  
    // 1) PDF-Buffer abrufen und rendern
    const buf = await this._sp.web
      .getFileByServerRelativePath(fileRef)
      .getBuffer();
    this.setState({ pdfBuffer: buf, status: '' });
    await this._renderPdf(buf);
  
    // 2) Die ID abrufen und im State speichern
    const pdfItem = await this._sp.web
      .getFileByServerRelativePath(fileRef)
      .getItem<{ Id: number }>('Id');
    const { Id: pdfItemId } = await pdfItem();
    this.setState({ currentPdfItemId: pdfItemId });
  
    // 3) Die zu diesem PDF gehörenden Icons laden
    await this._icons.loadIconsForPdf(pdfItemId);
  };


  public render(): React.ReactElement<IPdf360ViewerProps> {
    const {
      projects,
      projectName,
      saving,
      status,
      selectedProjectId,
      projectDocs,
      newPdfFile,
      icons,
      isModalOpen,
      newImageFile,
    } = this.state;
  
    return (
      <div className={styles.wrapper}>
        {/* ========== LINKES PANEL – Projekt erstellen / laden ========== */}
        <CreatorPanel
          /* --- state --- */
          projectName={projectName}
          saving={saving}
          showCreateForm={this.state.showCreateForm}
          showLoadForm={this.state.showLoadForm}
          newPdfFile={newPdfFile}
          newImageFile={newImageFile}
          projects={projects}
          selectedProjectId={this.state.selectedProjectId}

          /* --- callbacks --- */
          onToggleCreateForm={this._toggleCreateForm}
          onToggleLoadForm={this._toggleLoadForm}
          onNameChange={this._onNameChange}
          onFileChange={this._onFileChange}
          onCreateProject={this._createProject}
          onProjectChange={this._onProjectChange}
          onDeleteProject={this._deleteCurrentProject}
          onNewPdfChange={this._onNewPdfChange}
          onUploadPdf={this._uploadPdfToProject}
          onNewImageChange={this._onNewImageChange}
          onAddIcon={this._icons.addIcon}
          newIconTitle={this.state.newIconTitle}
          onIconTitleChange={this._onIconTitleChange}
          status={status}

          showIconPanel={this.state.showIconPanel}
          onToggleIconPanel={this._toggleIconPanel}

          /* --- folders --- */
          showFolderPanel={this.state.showFolderPanel}
          onToggleFolderPanel={this._toggleFolderPanel}
          subfolders={this.state.subfolders}
          selectedSubfolder={this.state.selectedSubfolder}
          folderNameInput={this.state.folderNameInput}
          onFolderNameChange={this._onFolderNameChange}
          onCreateSubfolder={this._createSubfolder}
          onSubfolderChange={this._onSubfolderChange}
          folderRenameInput={this.state.folderRenameInput}
          onFolderRenameChange={this._onFolderRenameChange}
          onRenameSubfolder={this._renameCurrentSubfolder}
          onDeleteSubfolder={this._deleteCurrentSubfolder}

          projectRenameInput={this.state.projectRenameInput}
          onProjectRenameChange={this._onProjectRenameChange}
          onRenameProject={this._renameCurrentProject}
          showProjectRenamePanel={this.state.showProjectRenamePanel}
          onToggleProjectRenamePanel={this._toggleProjectRenamePanel}
          showAddPdfPanel={this.state.showAddPdfPanel}
          onToggleAddPdfPanel={this._toggleAddPdfPanel}
          showRenamePlansPanel={this.state.showRenamePlansPanel}
          onToggleRenamePlansPanel={this._toggleRenamePlansPanel}
          docsForRename={this.state.projectDocs}
          planNameEdits={this.state.planNameEdits}
          onPlanNameEditChange={this._onPlanNameEditChange}
          onSaveRenamedPlans={this._saveRenamedPlans}
        />
        {/* ========== RECHTES PANEL – PDF- & Icon-Flow ========== */}
        <div className={styles.canvasPane}>
          {status && <p className={styles.status}>{status}</p>}
  
          {selectedProjectId ? (
            <>
              {/* PDF-Buttons im Projekt */}
              <div className={styles.pdfList}>
                {projectDocs.map(doc => (
                  <button key={doc.FileRef}
                    className={styles.pdfButton}
                    onClick={() => this._onPdfSelect(doc.FileRef)}>
                    {doc.FileLeafRef}
                  </button>
                ))}
              </div>
  
              {/* -------- PDF CANVAS + ICONS -------- */}
              <PdfCanvas
                pdfBuffer={this.state.pdfBuffer}
                icons={icons}
                dragIconId={this.state.dragIconId}
                showTrash={this.state.showTrash}
                trashHover={this.state.trashHover}
                currentPdfItemId={this.state.currentPdfItemId}
                canvasWrapRef={this._canvasWrapRef}
                trashRef={this._trashRef}
                onDeleteCurrentPdf={this._deleteCurrentPdf}
                onIconMouseDown={this._icons.onIconMouseDown}
                onIconClick={id => {
                  if (!this.state.didDrag) {
                    this._icons.openIconModal(id);
                  }
                }}
              />
            </>
          ) : (
            <div className={styles.helpBox}>
              <DefaultHelpDE />
            </div>
          )}
  
          {/* -------- 360° MODAL -------- */}
          <IconModal
            isOpen={isModalOpen}
            saving={saving}
            iconImages={this.state.iconImages}
            modalImageUrl={this.state.modalImageUrl}
            uploadingImage={this.state.uploadingImage}
            onDismiss={this._closeModal}
            onNewIconImage={this._onNewIconImage}
            onUploadIconImage={this._icons.uploadIconImage}
            onSelectImage={url => this.setState({ modalImageUrl: url })}
            onDeleteIconImage={this._deleteIconImage}
          />
        </div>
      </div>
    );
  }    
}