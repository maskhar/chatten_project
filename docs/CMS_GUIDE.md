# CMS Guide

## Homepage

- Drag section cards, then select **Save display order**.
- Use **Move up** and **Move down** for keyboard-friendly ordering.
- Use **Show** or **Hide** to control public homepage visibility.
- Use **Edit** to open each section editor. Public homepage reflects saved order and visibility.

## Experiences

- View all experiences in a visual card layout showing thumbnail, title, slug, description, and status.
- Use **Add Experience** to create a new experience with name, slug, description, and approved media.
- Click **Edit** on any experience card to modify its details.
- Experience name is the public display title shown on `/experience` and `/experience/[slug]`.
- Slug must be URL-friendly (e.g., `morning-coffee`). It becomes the public URL path.
- Description appears on both the experience list and detail pages.
- Select approved images using the Media Picker.
- Active checkbox controls whether the experience is visible (used with status for publishing).
- Status can be **Draft** or **Published**. Only published + active experiences appear on the public website.
- **Save Changes** updates the experience. **Cancel** returns to the experiences list without saving.

## Menu

- Add, edit, delete, drag, or move menu categories. Categories containing items cannot be deleted.
- Add items with category, Rupiah price, availability, description, and approved media.
- Edit, duplicate, delete, drag, or move items inside their category.
- Availability changes publish immediately. Reused media remains in Media Library.
- Enter prices as normal Rupiah numbers such as `25000`; lists display `Rp 25.000`.

## Gallery

- Add approved images from Media Library, edit caption and alt text, replace image references, show or hide items, and remove Gallery records.
- Drag items or use Move Up/Down to save public ordering.
- Removing Gallery item does not delete shared Media Library asset.

## Choosing Images

When selecting images for content (Hero, Moments, Menu, Gallery, Experiences, Events, Promotions), the Media Picker shows only **Approved** images. Images with **Needs Review** or **Restricted** rights status are not selectable.

### Search and Filter

- **Search** matches image titles, alt text, and categories (case-insensitive).
- **Category filter** shows all unique categories from approved images, sorted alphabetically.
- Search and Category combine with AND logic—both conditions must match.
- Use **Clear filters** to reset search and category together.

### Selecting Images

- Currently selected image shows a **Selected** label above the title for clarity.
- The selected thumbnail displays a green ring border and shows selection state in the grid.
- Click any image thumbnail to select it.
- Use **Replace** to change the current selection without removing it first.
- Use **Remove** to clear the selection (only available when the field is optional).

### Empty States

- If no approved images exist, the picker shows: **No approved images yet** with guidance to upload and approve images first.
- **Open Media Library** button navigates directly to `/admin/media` for uploading and approval.
- If filters exclude all results, the picker shows: **No images match your filters** with a **Clear filters** action.

### Workflow

1. Upload images through Media Library
2. Approve images by setting Rights status to **Approved**
3. Return to content editor (Hero, Menu, Gallery, Experiences, etc.)
4. Select approved images through the Media Picker

## Media Search

- Type a word into **Search media...**, submit, then use **Clear search** to return to full library.
- Media Rights filter: All rights, Approved, Needs Review, Restricted. Search and Rights combine.
- Usage filter: All usage, Used, or Unused; combines with Search and Rights.
- Category filter derives existing Media categories and combines with Search, Rights, and Usage.
- **Clear filters** resets Search, Rights, Usage, and Category together.

## Uploading Multiple Images

- Choose multiple images in one file-picker interaction, or drag and drop images into the upload zone.
- Each upload accepts a maximum of 20 files. Selections over the limit remain visible so files can be removed before submission.
- Supported formats are JPEG, PNG, WebP, and AVIF, with a maximum size of 10 MB per image.
- New uploads default to **Needs Review** until an authorized operator approves their rights status.

## Upload Results

- Each selected file displays its own status: **Ready**, **Uploading**, **Complete**, or **Failed**.
- Failed files show the specific reason, such as unsupported format, file size limit, or duplicate detection.
- One failed file does not cancel successful uploads in the same batch.
- After upload completes, a summary shows how many images uploaded successfully and how many failed.
- Use **Clear results** to reset the queue and start a new upload batch.

## Used In

- Open a Media item from **View / Edit** in Media Library.
- **Used In** shows every CMS resource currently referencing that image with human-readable resource and content names.
- Images without references show `This image is not currently used anywhere.`

## Deleting Media

- Unused images may be deleted from Media Library after confirming permanent removal from Storage.
- Used images cannot be deleted. The Media card shows current usage count plus human-readable resource and content names.
- Remove or change every listed content reference before deleting the image.
- Server checks current usage again when Delete is submitted, so stale page state cannot bypass protection.