// DeleteHelpers.ts
// --------------------------------------------------------------------------------------------------
// Zentrale Sammlung aller Lösch‑Utilities für die Pdf360Viewer‑Komponente.
// --------------------------------------------------------------------------------------------------

import type { SPFI } from '@pnp/sp';

/**
 * Kontext‑Typ der Funktionen.  
 * Enthält die von den Lösch‑Routinen benötigten Properties;  
 * alle weiteren Member der React‑Komponente werden über die Index‑Signatur zugelassen.
 */
export type DeleteCtx = {
  _sp: SPFI;
  _docLibUrl: string;
  state: any;
  setState: (...args: any[]) => void;
  [key: string]: any;
};

// ------------------------------------------------------------------------------------------------------------------
// 1) EINZELNES BILD LÖSCHEN
// ------------------------------------------------------------------------------------------------------------------
export async function deleteIconImage(
  this: DeleteCtx,
  imgItemId: number,
  imageFileId: number,
  url: string
): Promise<void> {
  if (!confirm('Dieses Bild wird gelöscht! Fortfahren?')) return;

  /** 0)  Falls es das aktuell angezeigte Bild ist → erst Ansicht leeren */
  if (this.state.modalImageUrl === url) {
    // Viewer fährt sich dabei in PanoramaViewer.useEffect‑Cleanup selbst herunter
    this.setState({ modalImageUrl: null });
    await new Promise(r => setTimeout(r, 100)); // 1‑2 Frames warten
  }

  try {
    /** 1) IconImages‑Zeile löschen */
    await this._sp.web.lists
      .getByTitle('IconImages')
      .items.getById(imgItemId)
      .delete();

    /** 2) Ist die Datei noch irgendwo verlinkt? */
    const refs = await this._sp.web.lists
      .getByTitle('IconImages')
      .items.filter(`ImageFileId eq ${imageFileId}`)
      .top(1)();

    /** 3) Nur wenn nicht → Datei recyceln */
    if (refs.length === 0) {
      await this._sp.web
        .getList(this._docLibUrl)
        .items.getById(imageFileId)
        .recycle();
    }

    /** 4) State aktualisieren */
    this.setState((state: any) => {
      const newImages = state.iconImages.filter((i: { imgItemId: number; }) => i.imgItemId !== imgItemId);
      return {
        iconImages: newImages,
        modalImageUrl: newImages.length ? newImages[0].url : null,
        status: '🗑️ Bild gelöscht',
      };
    });
  } catch (e: any) {
    console.error(e);
    alert(`🚫 Fehler beim Löschen des Bildes: ${e.message}`);
  }
}

// ------------------------------------------------------------------------------------------------------------------
// 2) KOMPLETTES ICON (Marker + Bilder) LÖSCHEN
// ------------------------------------------------------------------------------------------------------------------
export async function deleteWholeIcon(
  this: DeleteCtx,
  iconLocId: number,
): Promise<void> {
  if (!confirm('Dieses Icon und alle Bilder werden gelöscht! Fortfahren?')) return;
  this.setState({ saving: true, status: 'Wird gelöscht…' });

  try {
    /** 1) Alle IconImage‑Zeilen + evtl. Bild‑Dateien */
    const imgs = await this._sp.web.lists
      .getByTitle('IconImages')
      .items.select('ID', 'ImageFileId')
      .filter(`IconId eq ${iconLocId}`)();

    for (const { ID: imgId, ImageFileId } of imgs as any[]) {
      // IconImages‑Zeile
      await this._sp.web.lists
        .getByTitle('IconImages')
        .items.getById(imgId)
        .delete();

      // Wird das Bild von einem anderen Icon verwendet?
      const stillUsed = await this._sp.web.lists
        .getByTitle('IconImages')
        .items.filter(`ImageFileId eq ${ImageFileId}`)
        .top(1)();
      if (stillUsed.length === 0) {
        await this._sp.web.getList(this._docLibUrl)
          .items.getById(ImageFileId)
          .recycle();
      }
    }

    /** 2) IconLocation‑Eintrag */
    await this._sp.web.lists
      .getByTitle('IconLocations')
      .items.getById(iconLocId)
      .delete();

    /** 3) Viewer / State aktualisieren */
    await this._loadIconsForPdf(this.state.currentPdfItemId);
    this.setState({ status: '🗑️ Icon gelöscht' });
  } catch (e: any) {
    console.error(e);
    this.setState({ status: `🚫 Fehler beim Löschen des Icons: ${e.message}` });
  } finally {
    this.setState({ saving: false });
  }
}

// ------------------------------------------------------------------------------------------------------------------
// 3) AKTUELLES PDF LÖSCHEN (und ggf. nächstes laden oder Projekt löschen)
// ------------------------------------------------------------------------------------------------------------------
export async function deleteCurrentPdf(this: DeleteCtx): Promise<void> {
  const { currentPdfItemId, selectedProjectId, selectedProjectName } = this.state;
  if (!currentPdfItemId || !selectedProjectName) return;

  if (!confirm('Dieses PDF und alle damit verbundenen Icone/Bilder werden gelöscht. Fortfahren?')) return;
  this.setState({ saving: true, status: 'Wird gelöscht…' });

  try {
    /* ---------- 1 | Icon‑ und Bildbereinigung ---------- */
    const icons = await this._sp.web.lists
      .getByTitle('IconLocations')
      .items.select('ID')
      .filter(`PdfFileId eq ${currentPdfItemId}`)();

    for (const { ID: iconId } of icons as any[]) {
      const imgs = await this._sp.web.lists
        .getByTitle('IconImages')
        .items.select('ID', 'ImageFileId')
        .filter(`IconId eq ${iconId}`)();

      for (const { ID: imgId, ImageFileId } of imgs as any[]) {
        await this._sp.web.lists.getByTitle('IconImages').items.getById(imgId).delete();

        const stillUsed = await this._sp.web.lists
          .getByTitle('IconImages')
          .items.filter(`ImageFileId eq ${ImageFileId}`)
          .top(1)();
        if (stillUsed.length === 0) {
          await this._sp.web.getList(this._docLibUrl)
            .items.getById(ImageFileId)
            .recycle();
        }
      }

      await this._sp.web.lists
        .getByTitle('IconLocations')
        .items.getById(iconId)
        .delete();
    }

    /* ---------- 2 | PDF selbst löschen ---------- */
    await this._sp.web.getList(this._docLibUrl)
      .items.getById(currentPdfItemId)
      .recycle();

    /* ---------- 3 | Gibt es ein weiteres PDF im Projekt? ---------- */
    const docs = await this._loadProjectDocs(selectedProjectName);   // ← Ordner scannen

    if (docs.length) {
    // Erstes PDF laden
    const [first] = docs;
    const buf = await this._sp.web
        .getFileByServerRelativePath(first.FileRef)
        .getBuffer();

    const { Id: newPdfId } = await this._sp.web
        .getFileByServerRelativePath(first.FileRef)
        .getItem<{ Id: number }>();

    await this._loadIconsForPdf(newPdfId);

    this.setState({
        status: '✅ PDF gelöscht.',
        projectDocs: docs,
        pdfBuffer: buf,
        currentPdfItemId: newPdfId
    });
    } else {
    /* --- kein PDF mehr → Projekt löschen --- */
    await this._sp.web.lists.getByTitle('Projekte')
            .items.getById(selectedProjectId!).delete();
    await this._sp.web
            .getFolderByServerRelativePath(`${this._docLibUrl}/${selectedProjectName}`)
            .recycle();

    window.location.reload();
    }
  } catch (e: any) {
    console.error(e);
    this.setState({ status: `🚫 Fehler beim Löschen des PDFs: ${e.message}` });
  } finally {
    this.setState({ saving: false });
  }
}

// ------------------------------------------------------------------------------------------------------------------
// 4) AKTUELLES PROJEKT LÖSCHEN (inkl. aller PDFs, Icons, Bilder)
// ------------------------------------------------------------------------------------------------------------------
export async function deleteCurrentProject(this: DeleteCtx): Promise<void> {
  const { selectedProjectId, selectedProjectName } = this.state;
  if (!selectedProjectId || !selectedProjectName) return;

  if (!confirm('Dieses Projekt, alle PDFs und sämtliche Icone/Bilder werden gelöscht. Fortfahren?')) return;
  this.setState({ saving: true, status: 'Wird gelöscht…' });

  try {
    /* 1) Alle mit dem Projekt verbundenen IconLocations */
    const icons = await this._sp.web.lists
      .getByTitle('IconLocations')
      .items.select('ID', 'PdfFileId')
      .filter(`ProjectId eq ${selectedProjectId}`)();

    for (const { ID: iconId, PdfFileId } of icons as any[]) {
      /* 1a) Zu jedem Icon dessen Bilder + ggf. Bild‑Dateien */
      const imgs = await this._sp.web.lists
        .getByTitle('IconImages')
        .items.select('ID', 'ImageFileId')
        .filter(`IconId eq ${iconId}`)();

      for (const { ID: imgId, ImageFileId } of imgs as any[]) {
        await this._sp.web.lists.getByTitle('IconImages').items.getById(imgId).delete();

        const stillUsed = await this._sp.web.lists
          .getByTitle('IconImages')
          .items.filter(`ImageFileId eq ${ImageFileId}`)
          .top(1)();
        if (stillUsed.length === 0) {
          await this._sp.web.getList(this._docLibUrl)
            .items.getById(ImageFileId)
            .recycle();
        }
      }

      /* 1b) IconLocation löschen */
      await this._sp.web.lists
        .getByTitle('IconLocations')
        .items.getById(iconId)
        .delete();

      /* 1c) Zugehöriges PDF löschen */
      await this._sp.web.getList(this._docLibUrl).items.getById(PdfFileId).recycle();
    }

    /* 2) Projekt‑Eintrag + Ordner löschen */
    await this._sp.web.lists.getByTitle('Projekte').items.getById(selectedProjectId).delete();
    await this._sp.web
      .getFolderByServerRelativePath(`${this._docLibUrl}/${selectedProjectName}`)
      .recycle();

    /* 3) Neustart */
    window.location.reload();
  } catch (e: any) {
    console.error(e);
    this.setState({ status: `🚫 Fehler beim Löschen des Projekts: ${e.message}` });
  } finally {
    this.setState({ saving: false });
  }
}
