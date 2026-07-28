import os
import sys
import subprocess
import win32com.client
import fitz

pptx_path = os.path.abspath('숏폼 스튜디어(기획교육과_이동은).pptx')
pdf_path = os.path.abspath('temp_target_ocr.pdf')

print("Converting PPTX to PDF via PowerPoint COM...")
app = win32com.client.Dispatch('PowerPoint.Application')
pres = app.Presentations.Open(pptx_path, WithWindow=False)
pres.SaveAs(pdf_path, 32)
pres.Close()

doc = fitz.open(pdf_path)
print(f"Total slides in PPTX: {len(doc)}")

def run_ps_ocr(img_path):
    abs_path = os.path.abspath(img_path).replace("'", "''")
    ps_cmd = f'''
    $imgPath = '{abs_path}'
    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType=WindowsRuntime] | Out-Null
    
    $fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {{ $_.Name -eq 'AsTask' -and $_.GetParameters().Length -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') }} | Select-Object -First 1
    
    $file = $asTask.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null, @($fileTask)).Result
    $streamTask = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = $asTask.MakeGenericMethod([Windows.Storage.Streams.IRandomAccessStream]).Invoke($null, @($streamTask)).Result
    
    $decoderTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.BitmapDecoder]).Invoke($null, @($decoderTask)).Result
    
    $bmpTask = $decoder.GetSoftwareBitmapAsync()
    $bmp = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap]).Invoke($null, @($bmpTask)).Result
    
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    $ocrTask = $engine.RecognizeAsync($bmp)
    $ocrResult = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null, @($ocrTask)).Result
    
    $ocrResult.Text
    '''
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, encoding='cp949', errors='ignore')
        return res.stdout.strip()
    except Exception as e:
        return str(e)

ocr_results = []
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    img_name = f"temp_slide_{i+1:02d}.png"
    pix.save(img_name)
    ocr_text = run_ps_ocr(img_name)
    slide_info = f"================ SLIDE {i+1:02d} ================\n{ocr_text}\n"
    print(slide_info)
    ocr_results.append(slide_info)
    if os.path.exists(img_name):
        os.remove(img_name)

if os.path.exists(pdf_path):
    os.remove(pdf_path)

with open("ocr_output_target_pptx.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(ocr_results))

print("Saved OCR output to ocr_output_target_pptx.txt")
