# Mistakes Log

## Lessons learned
- When user uploads Stitch package with {{DATA:SCREEN:X}} placeholders, check that placeholders resolved before comparing. If unresolved, ask user for actual files.
- Don't do full design overhauls when small surgical changes achieve 90% of the value.

## Absolute vs relative paths
- href="/page.html" works on prod (yardendamri.co.il) but breaks on raw.githack.com preview
- Solution: use relative paths href="page.html" when all files are flat in root - works everywhere
- Lesson: think about preview compatibility when using absolute paths
