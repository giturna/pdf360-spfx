
# pdf360-Viewer (SPFx version)

## Summary
**pdf360-Viewer** is an SPFx web part that lets you  

* upload **PDF plans** for each project  
* drag-and-drop **camera icons** onto the plan (position stored as X/Y percent)  
* attach one or more **360-degree panorama images** to every icon  
* view the panoramas in an in-browser viewer (mobile & desktop)  

All data is stored natively in SharePoint Online: one folder per project in the **Documents** library plus three helper lists.

> *(Add a screenshot or GIF here to showcase the experience.)*

---

## Used SharePoint Framework Version
![version](https://img.shields.io/badge/version-1.20.0-green.svg)

## Applies to
- [SharePoint Framework](https://aka.ms/spfx)  
- Microsoft 365 tenant

> Need a tenant? Join the free [Microsoft 365 developer program](https://aka.ms/o365devprogram).

---

## Prerequisites
Create three custom SharePoint **Lists** and make sure the default **Documents** library exists.

| List | Required Columns |
|------|------------------|
| **Projects** | *Title* (single line of text) |
| **IconLocations** | *Title* (text) • *Project* (Lookup → **Projects**, Title) • *PdfFile* (Lookup → **Documents**, ID) • *XPercent* (Number, 5 decimals, 0–1) • *YPercent* (Number, 5 decimals, 0–1) |
| **IconImages** | *Title* (text) • *Icon* (Lookup → **IconLocations**, Title) • *ImageFile* (Lookup → **Documents**, ID) |

> When a new project is created the web part automatically adds a **folder with the same name** inside **Documents** and stores all PDFs and images for that project there.

---

## Solution

| Solution | Author |
|----------|-----------|
| pdf360-Viewer (SPFx version) | Giray Turna |

### Technologies
- React 18 & Fluent UI  
- PnP JS (files, folders, items)  
- PDF.js 2.16 for plan rendering  
- Three.js (custom 360° panorama viewer)  
- TypeScript 5, SCSS modules  

---

## Version history
| Version | Date       | Comments      |
|---------|------------|---------------|
| 1.0.0   | Jul 02 2025 | Initial release |

---

## Disclaimer
**THIS CODE IS PROVIDED _AS IS_ WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**

---

## Minimal Path to Awesome

```bash
git clone https://github.com/giturna/pdf360-spfx.git
cd pdf360-spfx
npm install
gulp serve
```

## How to Use

1. **Add the web part**  
   Place **pdf360-Viewer** on a Workbench page (`https://localhost:4321/temp/workbench.html`) or any modern SharePoint page.

2. **Check required assets**  
   Ensure the **Documents** library and the three lists (*Projects*, *IconLocations*, *IconImages*) exist.  

3. **Get started**  
   Create projects, upload PDF plans and drop camera icons on the plan – the built-in help panel guides you through every step.

---

## Features

- **Project management** – create, load or delete entire projects  
- **Multiple plans per project** – upload as many PDFs as you need  
- **Icon placement** – long-press an icon, drag it onto the plan; position saved as relative X/Y  
- **Image management** – attach, switch or delete multiple 360° panoramas per icon  
- **Interactive 360° viewer** – smooth orbit/zoom controls; mobile-friendly, responsive layout  
- **Trash drop-zone** – drag icons onto the red bin to remove them; delete plans or projects with one click  
- **100 % client-side** – pure SPFx; no server components required

---

## References

- [Getting started with SPFx](https://learn.microsoft.com/sharepoint/dev/spfx/set-up-your-developer-tenant)  
- [PnP JS](https://pnp.github.io/pnpjs/)  
- [Three.js](https://threejs.org/)  
- [Microsoft 365 PnP Community](https://aka.ms/m365pnp)