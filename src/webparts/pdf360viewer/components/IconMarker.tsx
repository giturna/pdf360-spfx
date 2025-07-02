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
}

const IconMarker: React.FC<IIconMarkerProps> = ({
  iconLocId,
  xPercent,
  yPercent,
  isDragging,
  onMouseDown,
  onClick
}) => {
  return (
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
  );
};

export default IconMarker;
