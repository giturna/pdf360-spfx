/**
 * IconManager.ts
 * ----------------------------------------------------------
 * Kapselt **alle** PDF‑/Icon‑bezogenen Daten‑Operationen und Drag‑N‑Drop‑Handler
 * der ursprünglichen *Pdf360Viewer.tsx*‑Komponente in eine eigenständige Klasse.
 */

import { SPFI } from '@pnp/sp';
import * as React from 'react';
import * as Del from './DeleteHelpers';
import type { DeleteCtx } from './DeleteHelpers';

// ------------------------------------------------------------
// Hilfstypen
// ------------------------------------------------------------
export interface IconPosition {
  iconLocId: number;
  xPercent: number;
  yPercent: number;
  imageUrl: string;
  title: string;
}

export interface IconImageRow {
  imgItemId: number;
  imageFileId: number;
  url: string;
  fileName: string;
}

interface IconManagerDeps {
  sp: SPFI;
  docLibUrl: string;
  canvasWrapRef: React.RefObject<HTMLDivElement>;
  trashRef: React.RefObject<HTMLDivElement>;
  /** React‑State auslesen (Pdf360Viewer.state) */
  getState: () => any;
  /** React‑State mutieren (Pdf360Viewer.setState) */
  setState: (update: any) => void;
}

export class IconManager {
  private sp: SPFI;
  private url: string;
  private canvasWrapRef: React.RefObject<HTMLDivElement>;
  private trashRef: React.RefObject<HTMLDivElement>;
  private get: () => any;
  private set: (upd: any) => void;

  constructor(deps: IconManagerDeps) {
    this.sp            = deps.sp;
    this.url           = deps.docLibUrl;
    this.canvasWrapRef = deps.canvasWrapRef;
    this.trashRef      = deps.trashRef;
    this.get           = deps.getState;
    this.set           = deps.setState;
  }

  /** ----------------------------------------------------------------
   * Icons zu einem PDF laden
   * ----------------------------------------------------------------*/
  public loadIconsForPdf = async (pdfItemId: number): Promise<void> => {
    try {
      this.set({ icons: [] });

      /* 1) Positionen abrufen */
      const locs = await this.sp.web.lists
        .getByTitle('IconLocations')
        .items
        .select('ID','XPercent','YPercent','Title')
        .filter(`PdfFileId eq ${pdfItemId}`)();

      /* 2) Je Position das erste 360‑Bild ermitteln */
      const icons: IconPosition[] = await Promise.all(locs.map(async loc => {
        const imgs = await this.sp.web.lists
          .getByTitle('IconImages')
          .items.select('ImageFileId')
          .filter(`IconId eq ${loc.ID}`)
          .top(1)();

        let imageUrl = '';
        if (imgs.length) {
          const imgId = imgs[0].ImageFileId;
          const fi = await this.sp.web
            .getList(this.url)
            .items.getById(imgId)
            .select('FileRef')();
          imageUrl = fi.FileRef;
        }

        return {
          iconLocId: loc.ID,
          xPercent:  loc.XPercent,
          yPercent:  loc.YPercent,
          imageUrl,
          title:loc.Title
        };
      }));

      this.set({ icons });
    } catch (e: any) {
      console.error(e);
      this.set({ status: `🚫 Fehler beim Laden der Icons: ${e.message}` });
    }
  };

  /** ----------------------------------------------------------------
   * Neues Icon (360‑Bild + Position) hinzufügen
   * ----------------------------------------------------------------*/
  public addIcon = async (): Promise<void> => {
    const st = this.get();
    const {
      selectedProjectName,
      currentPdfItemId,
      newImageFile,
      selectedProjectId,
      newIconTitle='',
      selectedSubfolder,
    } = st;

    if (!selectedProjectName || !currentPdfItemId || !newImageFile || !selectedProjectId) {
      this.set({ status: '❗ Bitte wählen Sie zuerst ein Projekt und anschließend ein 360°‑Bild aus.' });
      return;
    }

    this.set({ saving: true, status: 'Icon wird hinzugefügt…' });
    try {
      /* 1 | 360‑Bild hochladen */
      const sub = selectedSubfolder && selectedSubfolder.trim() ? `/${selectedSubfolder}` : '';
      const targetFolder = `${this.url}/${selectedProjectName}${sub}`;

      const imgRes = await this.sp.web
        .getFolderByServerRelativePath(targetFolder)
        .files.addUsingPath(newImageFile.name, newImageFile, { Overwrite:true });
      const imgItem = await imgRes.file.getItem();
      await imgItem.update({ FileType: 'Image360' });
      const imgId = (await imgItem()).Id;

      const iconFolderName = await this._getNextIconFolderName(selectedProjectName);
      const iconTitle = newIconTitle.trim() || iconFolderName;

      /* 2 | Position (0.5/0.5) anlegen */
      const locRes = await this.sp.web.lists.getByTitle('IconLocations')
        .items.add({
          ProjectId: selectedProjectId,
          PdfFileId: currentPdfItemId,
          XPercent: 0.5,
          YPercent: 0.5,
          Title: iconTitle
        });
      const iconLocId = locRes.data.ID;

      /* 3 | IconImages‑Zeile */
      await this.sp.web.lists
        .getByTitle('IconImages')
        .items.add({
          IconId: iconLocId,
          ImageFileId: imgId,
          Title: newImageFile.name
        });

      /* 4 | State erweitern */
      const { ServerRelativeUrl } = imgRes.data;
      this.set((state: any) => ({
        icons: state.icons.concat({
          iconLocId,
          xPercent: 0.5,
          yPercent: 0.5,
          imageUrl: ServerRelativeUrl,
          title: iconTitle
        }),
        newImageFile: null,
        newIconTitle: '',
        status: '✅ Icon wurde hinzugefügt.'
      }));
    } catch (e: any) {
      console.error(e);
      this.set({ status: `🚫 Fehler beim Hinzufügen des Icons: ${e.message}` });
    } finally {
      this.set({ saving: false });
    }
  };

  /** ----------------------------------------------------------------
   * Modal öffnen & Bilder zu Icon laden
   * ----------------------------------------------------------------*/
  public openIconModal = async (iconLocId: number): Promise<void> => {
    try {
      /* 1 | Bilder‑IDs zu diesem Icon */
      const imgs = await this.sp.web.lists
        .getByTitle('IconImages')
        .items.select('ID','ImageFileId','Title')
        .filter(`IconId eq ${iconLocId}`)
        .orderBy('ID', true)();

      /* 2 | Pfade auflösen */
      const iconImages: IconImageRow[] = await Promise.all(imgs.map(async r => {
        const imgItem = await this.sp.web
          .getList(this.url)
          .items.getById(r.ImageFileId)
          .select('FileRef','FileLeafRef')();
        return {
          imgItemId:   r.ID,
          imageFileId: r.ImageFileId,
          url:         imgItem.FileRef,
          fileName:    imgItem.FileLeafRef
        };
      }));

      this.set({
        isModalOpen: true,
        currentIconId: iconLocId,
        iconImages,
        modalImageUrl: iconImages.length ? iconImages[0].url : null
      });
    } catch (e:any) {
      console.error(e);
      this.set({ status: `🚫 Fehler beim Öffnen des Modals: ${e.message}` });
    }
  };

  /** ----------------------------------------------------------------
   * Neues 360‑Bild in bestehendes Icon hochladen
   * ----------------------------------------------------------------*/
  public uploadIconImage = async (): Promise<void> => {
    const st = this.get();
    const { uploadingImage, selectedProjectName, currentIconId, selectedSubfolder } = st;
    if (!uploadingImage || !currentIconId || !selectedProjectName) return;

    this.set({ saving: true });
    try {
      const sub = selectedSubfolder && selectedSubfolder.trim() ? `/${selectedSubfolder}` : '';
      const targetFolder = `${this.url}/${selectedProjectName}${sub}`;

      const fileRes = await this.sp.web
        .getFolderByServerRelativePath(targetFolder)
        .files.addUsingPath(uploadingImage.name, uploadingImage, { Overwrite: true });
      const item = await fileRes.file.getItem();
      await item.update({ FileType: 'Image360' });
      const imgItemId = (await item()).Id;

      await this.sp.web.lists.getByTitle('IconImages').items.add({
        IconId: currentIconId,
        ImageFileId: imgItemId,
        Title: uploadingImage.name
      });

      const { ServerRelativeUrl } = fileRes.data;
      this.set((state: any) => ({
        iconImages: state.iconImages.concat({
          imgItemId,
          imageFileId: imgItemId,
          url: ServerRelativeUrl,
          fileName: uploadingImage.name
        }),
        uploadingImage: null
      }));
    } catch (e:any) {
      console.error(e);
      this.set({ status: `🚫 Fehler beim Hochladen des Bildes: ${e.message}` });
    } finally {
      this.set({ saving: false });
    }
  };

  // ============================================================
  // DRAG‑&‑DROP – Maus‑Handler
  // ============================================================
  private longPressTimer: number | undefined;

  public onIconMouseDown = (
    e: React.MouseEvent<HTMLImageElement>,
    iconId: number
  ): void => {
    const rect = this.canvasWrapRef.current!.getBoundingClientRect();

    /* Lang‑Druck => Papierkorb anzeigen */
    this.longPressTimer = window.setTimeout(() =>
      this.set({ showTrash: true }), 600);

    this.set({
      dragIconId:   iconId,
      didDrag:      false,
      containerRect: rect,
      longPressTimer: this.longPressTimer
    });

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup',   this.onMouseUp);
  };

  private onMouseMove = (ev: MouseEvent): void => {
    const st = this.get();
    const { dragIconId, icons, containerRect, showTrash } = st;
    if (!dragIconId || !containerRect) return;

    const xPct = (ev.clientX - containerRect.left) / containerRect.width;
    const yPct = (ev.clientY - containerRect.top)  / containerRect.height;
    const xClamped = Math.max(0, Math.min(1, xPct));
    const yClamped = Math.max(0, Math.min(1, yPct));

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
      this.set({ longPressTimer: undefined });
    }

    this.set({
      didDrag: true,
      icons: icons.map((ic: IconPosition) =>
        ic.iconLocId === dragIconId
          ? { ...ic, xPercent: xClamped, yPercent: yClamped }
          : ic
      )
    });

    if (showTrash) {
      const trash = this.trashRef.current;
      if (trash) {
        const tRect = trash.getBoundingClientRect();
        const inside =
          ev.clientX >= tRect.left && ev.clientX <= tRect.right &&
          ev.clientY >= tRect.top  && ev.clientY <= tRect.bottom;
        this.set({ trashHover: inside });
      }
    }
  };

  private onMouseUp = async (): Promise<void> => {
    const st = this.get();
    const { dragIconId, didDrag, trashHover, icons } = st;

    /* Listener entfernen */
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);

    if (!dragIconId) return;

    // ----------------------------------------------
    // Papierkorb loslassen => Icon löschen
    // ----------------------------------------------
    if (trashHover) {
      await (Del.deleteWholeIcon as any as (this: DeleteCtx, iconLocId:number)=>Promise<void>).call(
        { ...this, state: st, setState: this.set, _sp: this.sp, _docLibUrl: this.url, _loadIconsForPdf: this.loadIconsForPdf },
        dragIconId
      );
      this.set({
        dragIconId: undefined,
        trashHover: false,
        showTrash:  false
      });
      return;
    }

    // ----------------------------------------------
    // Icon wurde verschoben → Position updaten
    // ----------------------------------------------
    if (didDrag) {
      const moved = icons.find((i: IconPosition) => i.iconLocId === dragIconId);
      if (moved) {
        await this.sp.web.lists
          .getByTitle('IconLocations')
          .items.getById(dragIconId)
          .update({
            XPercent: moved.xPercent,
            YPercent: moved.yPercent
          });
      }
    }

    this.set({
      dragIconId:   undefined,
      containerRect: undefined,
      didDrag:      undefined,
      showTrash:    false,
      trashHover:   false
    });
  };

  /* ---------------------------------------------------------------------------
   *  Hilfs‑Methode: nächster Icon_N Ordnername                                   
   * --------------------------------------------------------------------------*/
  private _getNextIconFolderName = async (projectName: string): Promise<string> => {
    const subs = await this.sp.web
      .getFolderByServerRelativePath(`${this.url}/${projectName}`)
      .folders.select('Name')();

    const last = (subs as any[])
      .map(f => /^Icon_(\d+)$/.exec(f.Name))
      .filter(Boolean)
      .map(m => parseInt(m![1], 10))
      .reduce((max, n) => Math.max(max, n), 0);

    return `Icon_${last + 1}`;
  };
}
