<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stores admin uploads as compact WebP files so the app stays fast on mobile data.
 */
class ImageStore
{
    public function __construct(private int $maxWidth = 900, private int $quality = 82) {}

    public function store(UploadedFile $file, string $folder, ?string $replace = null): string
    {
        // Every upload is decoded and re-encoded: the original bytes are never served, which rules out
        // disguised scripts/polyglots and strips metadata such as GPS location.
        $source = @imagecreatefromstring($file->getContent());

        if ($source === false) {
            throw ValidationException::withMessages(['image' => 'تعذّرت قراءة الصورة. استخدم JPG أو PNG أو WebP.']);
        }

        $path = $folder.'/'.Str::uuid().'.webp';
        Storage::disk('public')->put($path, $this->encode($source));

        $this->delete($replace);

        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    private function encode(\GdImage $image): string
    {
        $width = imagesx($image);

        if ($width > $this->maxWidth) {
            $image = imagescale($image, $this->maxWidth);
        }

        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);

        ob_start();
        imagewebp($image, null, $this->quality);

        return (string) ob_get_clean();
    }
}
