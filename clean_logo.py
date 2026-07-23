import os
from PIL import Image

# Define paths relative to this script location (project root)
proj_root = os.path.abspath(os.path.dirname(__file__))
orig_path = os.path.join(proj_root, 'public', 'gb_logo.png')
output_path = os.path.join(proj_root, 'public', 'gb_logo_clean.png')

if not os.path.exists(orig_path):
    raise FileNotFoundError(f'Original logo not found at {orig_path}')

# Load original image
im = Image.open(orig_path).convert('RGBA')

# Crop region (left, top, right, bottom) - adjust as needed
crop_box = (110, 250, 226, 326)
crop = im.crop(crop_box)

# Pad to square canvas with transparent background
w, h = crop.size
size = max(w, h)
new_im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
new_im.paste(crop, ((size - w) // 2, (size - h) // 2))

# Save cleaned logo
new_im.save(output_path)
print(f'Saved cleaned logo to {output_path}')
