## iAdmit Mobile – Latest Patch

Release Date: 2025-09-23

### Added
- ID Card with tap-to-flip animation (front/back).
- Back side includes Emergency Contact with clearer labels ("Name:", "Phone:").
- QR code on the back; scanning opens the OCC Admission portal (https://occadmission.site/login).
- "Tap to flip" hint added on both sides of the card.

### Improved
- Front card watermark using `occbld.png`, scaled to cover the card with adjustable opacity.
- Right-edge scrim and subtle text shadows for readability over the watermark.
- Bubble/stripe decorative pattern mirrored on the back to match the front.
- Color and hierarchy harmonization:
  - Section titles use brand blue, labels cooler gray, values deeper neutral.
  - Dividers/borders softened for a cleaner, professional look.
- Layout tightened to prevent clipping/overlap on small screens.
- Parent/Guardian info moved from front to back (Emergency Contact) for better focus.

### Accessibility
- Increased contrast for body text over image/scrim.
- Consistent icon and text styling across sections.
- Responsive tuning for small screens (opacity and spacing).

### Export/Share
- Download/share ID card image with graceful fallback if storage permissions aren’t granted.

### Fixes
- Resolved overlapping elements on the back; QR now aligns within Emergency Contact.
- Adjusted spacing, margins, and line heights to avoid truncation.

### Dev Notes
- Watermark controls: see `idWatermark` style and the watermark `<Image />` inside `components/EditableProfileModal.jsx` (front `idBody`). Tweak `top/left/opacity/resizeMode` as needed.
- Build: Windows `cd iAdmit/android && .\\gradlew.bat assembleRelease`; macOS/Linux `cd iAdmit/android && ./gradlew assembleRelease`.


