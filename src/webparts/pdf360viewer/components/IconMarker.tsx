import * as React from 'react';
import styles from './Pdf360Viewer.module.scss';
import iconImg from '../assets/icon.png';

export interface IIconMarkerProps {
  iconLocId: number;
  xPercent: number;
  yPercent: number;
  isDragging: boolean;
  onMouseDown: (
    e: React.MouseEvent<HTMLImageElement>,
    iconId: number
  ) => void;
  onClick: (iconId: number) => void;
  title: string;
}

const IconMarker: React.FC<IIconMarkerProps> = ({
  iconLocId,
  xPercent,
  yPercent,
  isDragging,
  onMouseDown,
  onClick,
  title
}) => {
  return (
    <div
      key={iconLocId}
      className={styles.iconWrap}
      style={{ left:`${xPercent*100}%`, top:`${yPercent*100}%` }}
    >
      <img
        src={iconImg}
        className={styles.icon}
        style={{
          left: `${xPercent * 100}%`,
          top: `${yPercent * 100}%`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={e => onMouseDown(e, iconLocId)}
        onClick={() => onClick(iconLocId)}
        draggable={false}
      />
      {title && <span className={styles.iconTip}>{title}</span>}
    </div>
  );
};

export default IconMarker;
