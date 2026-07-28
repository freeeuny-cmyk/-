import os
import sys
import subprocess

def run_ps_ocr(img_path):
    abs_path = os.path.abspath(img_path).replace("'", "''")
    ps_cmd = f'''
    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType=WindowsRuntime] | Out-Null
    
    $fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync('{abs_path}')
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {{ $_.Name -eq 'AsTask' -and $_.GetParameters().Length -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') }} | Select-Object -First 1
    
    $file = $asTask.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null, @($fileTask)).Result
    $streamTask = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = $asTask.MakeGenericMethod([Windows.Storage.Streams.IRandomAccessStream]).Invoke($null, @($streamTask)).Result
    
    $decoderTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.BitmapDecoder]).Invoke($null, @($decoderTask)).Result
    
    $bmpTask = $decoder.GetSoftwareBitmapAsync()
    $bmp = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap]).Invoke($null, @($bmpTask)).Result
    
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('ko'))
    if (-not $engine) {{ $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }}
    
    $ocrTask = $engine.RecognizeAsync($bmp)
    $ocrResult = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null, @($ocrTask)).Result
    
    $ocrResult.Text
    '''
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, encoding='cp949', errors='ignore')
        return res.stdout.strip()
    except Exception as e:
        return str(e)

out = []
for i in range(1, 11):
    img_path = f"ppt_exported_pngs/slide_{i:02d}.png"
    if os.path.exists(img_path):
        txt = run_ps_ocr(img_path)
        hdr = f"================ SLIDE {i:02d} ================"
        print(hdr)
        print(txt)
        out.append(hdr + "\n" + txt)

with open("ocr_results_exported_pngs.txt", "w", encoding="utf-8") as f:
    f.write("\n\n".join(out))

print("Saved OCR results to ocr_results_exported_pngs.txt")
