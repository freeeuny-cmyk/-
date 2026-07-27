import os
import sys
import subprocess

def run_ps_ocr(img_path):
    abs_path = os.path.abspath(img_path).replace("'", "''")
    ps_cmd = """
    $imgPath = '""" + abs_path + """'
    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType=WindowsRuntime] | Out-Null
    
    $fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($imgPath)
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Length -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') } | Select-Object -First 1
    
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
    """
    try:
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, encoding='cp949', errors='ignore')
        return res.stdout.strip()
    except Exception as e:
        return str(e)

def main():
    for i in range(1, 12):
        img_name = f"slide_img_{i:02d}.png"
        if os.path.exists(img_name):
            text = run_ps_ocr(img_name)
            print(f"=== SLIDE {i:02d} ===")
            print(text if text else "(No text detected)")
            print()

if __name__ == '__main__':
    main()
