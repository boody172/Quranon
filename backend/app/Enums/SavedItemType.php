<?php

namespace App\Enums;

enum SavedItemType: string
{
    case Reciter = 'reciter';
    case Surah = 'surah';
    case Ayah = 'ayah';
    case Radio = 'radio';
    case Lesson = 'lesson';
    case Scholar = 'scholar';
}
