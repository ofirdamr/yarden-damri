# Progress Log

## 2026-05-27 - ui-redesign branch
- Compared Stitch package vs current ui-redesign design
- Adopted only 1 thing from Stitch (video hero already exists):
  - Warm cream surface #fdf8f5 (replaced pure white)
- Kept editorial sharp cuts (rejected Material 3 rounded corners - too "app-like" for bridal luxury)
- Changes: --cream variable + body + section backgrounds (#about, #services, #philosophy, #area, #contact, .gallery-section)
- Cards/buttons/nav stay white → pop slightly on cream bg (Vogue-style contrast)

## 2026-05-27 - Fix nav links for preview
- Issue: absolute paths /services.html broke on raw.githack.com preview
- Fix: converted all href="/page.html" → href="page.html" across all 11 HTML files
- Safe because: all files flat in root, works on both production domain and preview
