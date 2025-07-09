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

  constructor(props: IPdf360ViewerProps) {
    super(props);
    this._sp = spfi().using(SPFx(this.props.context));
    this._deleteIconImage      = Del.deleteIconImage.bind(this);
    this._deleteCurrentPdf     = Del.deleteCurrentPdf.bind(this);
    this._deleteCurrentProject = Del.deleteCurrentProject.bind(this);
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
      showLoadForm: false
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


  private _loadProjectDocs = async (projectName: string)
    : Promise<{ FileRef:string; FileLeafRef:string }[]> => {

    const folderPath = `${this._docLibUrl}/${projectName}`;
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
      status:              '⏳ PDF wird geladen…'
    });
  
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


  private _onNewImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ newImageFile: e.target.files?.[0] ?? null });
  }


  private _closeModal = (): void => {
    this.setState({ isModalOpen: false, modalImageUrl: null });
  }


  private async _renderPdf(data: ArrayBuffer): Promise<void> {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf  = await loadingTask.promise;
    const page = await pdf.getPage(1);
  
    const container = this._canvasWrapRef.current;
    if (!container) return;
  
    /* 1) Die Breite des Containers wird als Referenz genommen */
    const targetWidth = container.clientWidth;
  
    const unscaled = page.getViewport({ scale: 1 });
    const scale    = targetWidth / unscaled.width;
  
    const vp   = page.getViewport({ scale });
    const c    = document.getElementById('pdfCanvas') as HTMLCanvasElement;
    const ctx  = c.getContext('2d')!;
  
    c.width  = vp.width;
    c.height = vp.height;
  
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    /* Canvas ist fertig — gleicht die Höhe des Wrappers an */
    this._canvasWrapRef.current!.style.height = `${vp.height}px`;
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


  private _uploadPdfToProject = async (): Promise<void> => {
    const { selectedProjectId, selectedProjectName, newPdfFile } = this.state;
    if (!selectedProjectId || !selectedProjectName || !newPdfFile) {
      this.setState({ status: '❗ Bitte wählen Sie zuerst ein Projekt aus und laden Sie eine PDF-Datei hoch.' });
      return;
    }
  
    this.setState({ saving: true, status: 'Wird geladen…' });
    try {
      // Zielordnerpfad: „Freigegebene Dokumente/Projektname“
      const folderPath = `${this._docLibUrl}/${selectedProjectName}`;
  
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