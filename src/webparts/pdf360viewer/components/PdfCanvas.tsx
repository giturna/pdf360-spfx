import * as React from 'react';
import styles from './Pdf360Viewer.module.scss';
import IconMarker from './IconMarker';
import trashIcon from '../assets/trash.png';

export interface IPdfCanvasProps {
  pdfBuffer: ArrayBuffer | null;
  icons: Array<{
    iconLocId: number;
    xPercent: number;
    yPercent: number;
    imageUrl: string;
  }>;
  dragIconId?: number;
  showTrash?: boolean;
  trashHover?: boolean;
  currentPdfItemId?: number;

  /* refs (von Parent erzeugt & durchgereicht) */
  canvasWrapRef: React.RefObject<HTMLDivElement>;
  trashRef: React.RefObject<HTMLDivElement>;

  /* callbacks */
  onDeleteCurrentPdf: () => Promise<void>;
  onIconMouseDown: (
    e: React.MouseEvent<HTMLImageElement>,
    iconId: number
  ) => void;
  onIconClick: (iconId: number) => void;
}

const PdfCanvas: React.FC<IPdfCanvasProps> = ({
  pdfBuffer,
  icons,
  dragIconId,
  showTrash,
  trashHover,
  currentPdfItemId,
  canvasWrapRef,
  trashRef,
  onDeleteCurrentPdf,
  onIconMouseDown,
  onIconClick
}) => {
  return (
    <div className={styles.canvasContainer} ref={canvasWrapRef}>
        {/* --- PDF löschen Button --- */}
        {currentPdfItemId && (
            <button
            className={styles.deletePdfBtn}
            onClick={onDeleteCurrentPdf}
            >
            Plan Löschen
            </button>
        )}

        {/* PDF Canvas */}
        <canvas
            id="pdfCanvas"
            style={{ display: pdfBuffer ? 'block' : 'none' }}
        />

        {/* Papierkorb beim Drag‑&‑Hold */}
        {showTrash && (
            <div
            ref={trashRef}
            className={styles.trash}
            style={{ borderColor: trashHover ? '#d13438' : 'transparent' }}
            >
            <img src={trashIcon} alt="Löschen" />
            </div>
        )}

        {/* Icon Marker */}
        {icons.map(ic => (
        <IconMarker
            key={ic.iconLocId}
            iconLocId={ic.iconLocId}
            xPercent={ic.xPercent}
            yPercent={ic.yPercent}
            isDragging={dragIconId === ic.iconLocId}
            onMouseDown={onIconMouseDown}
            onClick={onIconClick}
        />
        ))}

    </div>
  );
};

export default PdfCanvas;
