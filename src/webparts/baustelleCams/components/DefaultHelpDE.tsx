/* components/DefaultHelpDE.tsx */
import * as React from 'react';
import styles from './DefaultHelpDE.module.scss';

const CollapsibleSection: React.FC<{ title:string; defaultOpen?:boolean }> = ({
    title, defaultOpen = false, children,
  }) => {
    const [open, setOpen] = React.useState(defaultOpen);
  
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>
          <button
            className={styles.toggleBtn}
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            {open ? '▾' : '▸'} {title}
          </button>
        </h2>
  
        {open && <div className={styles.body}>{children}</div>}
      </section>
    );
};


/** 360-Grad-Cams – Kurzanleitung */
const DefaultHelpDE: React.FC = () => (
  <div style={{ maxWidth: 620, lineHeight: 1.45 }}>

    <CollapsibleSection title="1 | Überblick">
        <ul>
            <li>Linke Seitenleiste → Projekt- und Dateiverwaltung (Plan hochladen, 360°-Foto hinzufügen, löschen usw.).</li>
            <li>Hauptbereich rechts → Der ausgewählte PDF-Plan mit darauf platzierten Kamera-Icons sowie der Panorama-Viewer.</li>
        </ul>
    </CollapsibleSection>

    <CollapsibleSection title="2 | Neues Projekt anlegen">
        <ol>
            <li>Auf die Schaltfläche „Neues Projekt erstellen“ klicken.</li>
            <li>Im eingeblendeten Formular:</li>
                <ul>
                    <li>Projektname eingeben.</li>
                    <li>PDF auswählen und den ersten Plan wählen.</li>
                </ul>
            <li>Auf Erstellen klicken → Das Projekt wird angelegt und der Plan hochgeladen.</li>
        </ol>
    </CollapsibleSection>

    <CollapsibleSection title="3 | Bestehendes Projekt laden">
        <ol>
            <li>In der Auswahlliste „Projekt laden“ den gewünschten Projektnamen wählen.</li>
            <li>In der PDF-Liste rechts den Plan anklicken, der angezeigt werden soll.</li>
        </ol>
    </CollapsibleSection>

    <CollapsibleSection title="4 | 360°-Foto hinzufügen">
        <ol>
            <li>In der linken Seitenleiste unter „360°-Bild mit neuem Icon hinzufügen“ eine 360° Bild wählen.</li>
            <li>Auf Icon hinzufügen klicken.</li>
                <ul>
                    <li>Ein neues Kamera-Icon erscheint in der Planmitte.</li>
                </ul>
            <li>Icon per Drag-&-Drop an die korrekte Position ziehen.</li>
            <li>Die Position wird automatisch gespeichert.</li>
        </ol>
    </CollapsibleSection>

    <CollapsibleSection title="5 | Panorama ansehen">
        <ul>
            <li>Icon anklicken → Panorama-Fenster öffnet sich.</li>
            <li>Mit gedrückter linker Maustaste umsehen.</li>
            <li>Oben rechts auf „X“ klicken, um das Fenster zu schließen.</li>
        </ul>
    </CollapsibleSection>

    <CollapsibleSection title="6 | Fotos an einem Icon verwalten">
        <ul>
            <li>Weitere Fotos hochladen: Im linken Bereich des Panorama-Fensters eine Datei wählen → Hochladen.</li>
            <li>Zwischen Fotos wechseln: Auf den Dateinamen klicken.</li>
            <li>Foto löschen: Auf „✕“ klicken und bestätigen.</li>
        </ul>
    </CollapsibleSection>

    <CollapsibleSection title="7 | Icon, Plan oder Projekt löschen">
        <ul>
            <li>Icon löschen: Icon ca. 1s gedrückt halten → Auf den roten Papierkorb ziehen → Loslassen → Bestätigen.</li>
            <li>Plan löschen: In der oberen rechten Ecke des Plans „Plan löschen“ klicken → Bestätigen.</li>
            <li>Projekt löschen: In der linken Seitenleiste „Projekt löschen“ klicken → Bestätigen.</li>
        </ul>
        Achtung Projekt löschen: entfernt dauerhaft alle zugehörigen PDFs und Fotos.
    </CollapsibleSection>

    <CollapsibleSection title="8 | Pläne hinzufügen oder ersetzen">
        <ol>
            <li>Unter „Weitere Pläne hinzufügen“ eine neue PDF wählen.</li>
            <li>Auf Hinzufügen klicken.</li>
            <li>Das PDF erscheint oben in der PDF-Liste. Anklicken, um es anzuzeigen.</li>
        </ol>
    </CollapsibleSection>

    <CollapsibleSection title="9 | Support">
        <ul>
            Bei Problemen schicken Sie bitte einen Screenshot mit kurzer Beschreibung.
        </ul>
    </CollapsibleSection>
  </div>
);

export default DefaultHelpDE;
