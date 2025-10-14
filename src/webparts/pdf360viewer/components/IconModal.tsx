import * as React from 'react';
import { Modal, IconButton } from '@fluentui/react';
import styles from './Pdf360Viewer.module.scss';
import { PanoViewer } from './PanoramaViewer';
import { DualPanoViewer } from './DualPanoViewer';

export interface IIconModalProps {
  /* visibility */
  isOpen: boolean;
  saving: boolean;

  /* image lists & selection */
  iconImages: Array<{
    imgItemId: number;
    imageFileId: number;
    url: string;
    fileName: string;
  }>;
  modalImageUrl: string | null;
  uploadingImage?: File | null;

  /* callbacks */
  onDismiss: () => void;
  onNewIconImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadIconImage: () => Promise<void>;
  onSelectImage: (url: string) => void;
  onDeleteIconImage: (
    imgItemId: number,
    imageFileId: number,
    url: string
  ) => void;
}

const IconModal: React.FC<IIconModalProps> = ({
  isOpen,
  saving,
  iconImages,
  modalImageUrl,
  uploadingImage,
  onDismiss,
  onNewIconImage,
  onUploadIconImage,
  onSelectImage,
  onDeleteIconImage
}) => {

  const [selected, setSelected] = React.useState<string[]>([]);
  React.useEffect(() => {
    // Modal her açıldığında reset
    if (isOpen) setSelected([]);
  }, [isOpen]);

  const toggle = (url: string) => {
    setSelected(prev => {
      const has = prev.includes(url);
      if (has) return prev.filter(u => u !== url);
      if (prev.length === 2) return [prev[1], url]; // max 2 tut
      return [...prev, url];
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      isBlocking={false}
      containerClassName={styles.modalHost}
      styles={{ main: { padding: 0 } }}
    >
      {/* ----- SCHLIESSEN ----- */}
      <IconButton
        iconProps={{ iconName: 'ChromeClose' }}
        className={styles.closeBtn}
        onClick={onDismiss}
        ariaLabel="Schließen"
      />

      <div className={styles.modalBody}>
        {/* -------- LINKES MENU -------- */}
        <div className={styles.sideBar}>
          <label>Weitere Bilder hinzufügen</label>
          <input
            type="file"
            accept="image/*"
            onChange={onNewIconImage}
            disabled={saving}
            className={styles.fileInput}
          />
          <button
            onClick={onUploadIconImage}
            disabled={!uploadingImage || saving}
            className={styles.primaryBtn}
          >
            Hochladen
          </button>

          <div className={styles.hr} />

          {iconImages.map(img => (
            <div key={img.imgItemId} className={styles.imgRow}>
              <button
                className={styles.imgBtn}
                onClick={() => onSelectImage(img.url)}
                title={img.fileName}
              >
                {img.fileName}
              </button>
              <input
                 type="checkbox"
                 style={{ marginLeft: 8 }}
                 checked={selected.includes(img.url)}
                 onChange={() => toggle(img.url)}
                 title="Zum Vergleich auswählen (max. 2)"
               />
              <button
                className={styles.delBtn}
                onClick={() =>
                  onDeleteIconImage(img.imgItemId, img.imageFileId, img.url)}
                title="Löschen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* -------- RECHTS: 360° VIEWER -------- */}
        <div className={styles.viewerPane}>
          {selected.length === 2 ? (
            <DualPanoViewer leftSrc={selected[0]} rightSrc={selected[1]} linkRotations />
          ) : modalImageUrl ? (
            <PanoViewer src={modalImageUrl} />
          ) : (
            <p>Das anzuzeigende Bild konnte nicht gefunden werden.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default IconModal;
