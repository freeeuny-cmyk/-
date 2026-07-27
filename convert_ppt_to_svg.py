import os
import sys
import win32com.client
import fitz  # PyMuPDF

def main():
    ppt_filename = 'AI_Agricultural_Disaster_Shorts_Studio.pptx'
    ppt_path = os.path.abspath(ppt_filename)
    
    if not os.path.exists(ppt_path):
        print(f"Error: {ppt_filename} not found!")
        return

    pdf_path = os.path.abspath('temp_presentation.pdf')
    out_dir_local = os.path.abspath('svg_slides')
    out_dir_desktop = os.path.abspath(os.path.join(os.path.expanduser('~'), 'Desktop', 'AI_Shorts_Studio_SVG_슬라이드'))
    
    os.makedirs(out_dir_local, exist_ok=True)
    os.makedirs(out_dir_desktop, exist_ok=True)

    print("1. Converting PPTX to PDF using PowerPoint COM...")
    try:
        app = win32com.client.Dispatch('PowerPoint.Application')
        # Open PowerPoint presentation
        pres = app.Presentations.Open(ppt_path, WithWindow=False)
        slide_count = pres.Slides.Count
        print(f"   Total Slides: {slide_count}")
        # Save as PDF (32 = ppSaveAsPDF)
        pres.SaveAs(pdf_path, 32)
        pres.Close()
    except Exception as e:
        print(f"PowerPoint COM Error: {e}")
        return

    print("\n2. Converting PDF pages to vector SVG files slide by slide...")
    doc = fitz.open(pdf_path)
    
    saved_files = []
    for i, page in enumerate(doc):
        slide_num = i + 1
        svg_text = page.get_svg_image()
        
        filename = f"slide_{slide_num:02d}.svg"
        path_local = os.path.join(out_dir_local, filename)
        path_desktop = os.path.join(out_dir_desktop, filename)
        
        with open(path_local, 'w', encoding='utf-8') as f:
            f.write(svg_text)
            
        with open(path_desktop, 'w', encoding='utf-8') as f:
            f.write(svg_text)
            
        saved_files.append((filename, path_desktop))
        print(f"   [Slide {slide_num:02d}/11] -> Saved {filename}")

    doc.close()
    
    # Clean up temporary PDF file
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except Exception:
            pass

    print("\n==================================================")
    print("  All 11 Slides Successfully Converted to SVG!")
    print(f"  Project Folder: {out_dir_local}")
    print(f"  Desktop Folder: {out_dir_desktop}")
    print("==================================================")

if __name__ == '__main__':
    main()
