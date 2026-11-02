<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HifzCircle;
use App\Models\User;
use App\Support\Quran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Group memorisation ("حلقة حفظ"): members share one daily plan and see each other's progress.
 * Only members can see a circle's board; anyone with the code can join.
 */
class HifzCircleController extends Controller
{
    private const MAX_CIRCLES_PER_USER = 20;

    public function index(Request $request): JsonResponse
    {
        $circles = $request->user()->hifzCircles()->withCount('members')->latest('hifz_circle_members.created_at')->get();

        return response()->json(['data' => $circles->map(fn (HifzCircle $c) => $this->summary($c))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'surah' => ['required', 'integer', 'between:1,114'],
            'from' => ['required', 'integer', 'min:1'],
            'to' => ['required', 'integer', 'gte:from'],
            'per_day' => ['required', 'integer', 'between:1,20'],
            'starts_on' => ['required', 'date_format:Y-m-d'],
        ]);
        if ($data['to'] > Quran::ayahs($data['surah'])) {
            throw ValidationException::withMessages(['to' => 'Out of range for this surah.']);
        }
        $user = $request->user();
        if ($user->hifzCircles()->count() >= self::MAX_CIRCLES_PER_USER) {
            throw ValidationException::withMessages(['circle' => 'Too many circles.']);
        }

        $circle = new HifzCircle([
            'name' => strip_tags($data['name']),
            'surah' => $data['surah'],
            'from_ayah' => $data['from'],
            'to_ayah' => $data['to'],
            'per_day' => $data['per_day'],
            'starts_on' => $data['starts_on'],
        ]);
        $circle->owner()->associate($user)->save();
        $circle->members()->attach($user);

        return response()->json(['data' => $this->board($circle, $user, $request)], 201);
    }

    public function show(Request $request, HifzCircle $circle): JsonResponse
    {
        abort_unless($circle->hasMember($request->user()), 403);

        return response()->json(['data' => $this->board($circle, $request->user(), $request)]);
    }

    public function join(Request $request, HifzCircle $circle): JsonResponse
    {
        $user = $request->user();
        if (! $circle->hasMember($user)) {
            if ($circle->members()->count() >= HifzCircle::MAX_MEMBERS) {
                throw ValidationException::withMessages(['circle' => 'This circle is full.']);
            }
            if ($user->hifzCircles()->count() >= self::MAX_CIRCLES_PER_USER) {
                throw ValidationException::withMessages(['circle' => 'Too many circles.']);
            }
            $circle->members()->attach($user);
        }

        return response()->json(['data' => $this->board($circle, $user, $request)]);
    }

    /** The member reports how many verses of the circle's range they know, and whether today's portion is done. */
    public function progress(Request $request, HifzCircle $circle): JsonResponse
    {
        $user = $request->user();
        abort_unless($circle->hasMember($user), 403);
        $data = $request->validate([
            'memorised' => ['required', 'integer', 'min:0', 'max:'.($circle->to_ayah - $circle->from_ayah + 1)],
            'done_today' => ['required', 'boolean'],
            'today' => ['nullable', 'date_format:Y-m-d'],
        ]);
        $today = $this->today($request, $data['today'] ?? null);

        $member = $circle->members()->whereKey($user->getKey())->first()->pivot;
        $changes = ['memorised' => $data['memorised']];
        if ($data['done_today'] && ! $member->last_done_on?->isSameDay($today)) {
            $continues = $member->last_done_on?->isSameDay($today->copy()->subDay());
            $changes['streak'] = $continues ? $member->streak + 1 : 1;
            $changes['last_done_on'] = $today->toDateString();
        }
        $circle->members()->updateExistingPivot($user->getKey(), $changes);

        return response()->json(['data' => $this->board($circle->fresh(), $user, $request)]);
    }

    public function leave(Request $request, HifzCircle $circle): JsonResponse
    {
        $circle->members()->detach($request->user());
        if (! $circle->members()->exists()) {
            $circle->delete();
        } elseif ($circle->owner_id === $request->user()->getKey()) {
            $circle->owner()->associate($circle->members()->oldest('hifz_circle_members.created_at')->first())->save();
        }

        return response()->json(status: 204);
    }

    // ---------- shapes ----------

    private function summary(HifzCircle $circle): array
    {
        return [
            'code' => $circle->code,
            'name' => $circle->name,
            'surah' => $circle->surah,
            'from' => $circle->from_ayah,
            'to' => $circle->to_ayah,
            'per_day' => $circle->per_day,
            'starts_on' => $circle->starts_on->toDateString(),
            'members_count' => $circle->members_count ?? $circle->members()->count(),
        ];
    }

    private function board(HifzCircle $circle, User $viewer, Request $request): array
    {
        $today = $this->today($request, $request->query('today'));
        $yesterday = $today->copy()->subDay();
        $members = $circle->members()->get()->map(fn (User $m) => [
            // First name only: circles can include people who don't know each other well.
            'name' => strtok(trim($m->name), ' ') ?: $m->name,
            'me' => $m->is($viewer),
            'owner' => $m->getKey() === $circle->owner_id,
            'memorised' => $m->pivot->memorised,
            'done_today' => (bool) $m->pivot->last_done_on?->isSameDay($today),
            // A streak only counts while it is alive (done today or yesterday).
            'streak' => $m->pivot->last_done_on && $m->pivot->last_done_on->gte($yesterday) ? $m->pivot->streak : 0,
        ])->sortByDesc(fn ($m) => [$m['memorised'], $m['streak']])->values();

        return $this->summary($circle) + ['members' => $members, 'members_count' => $members->count()];
    }

    /** The member's own calendar day (sent by the app), trusted only within a day of the server's. */
    private function today(Request $request, ?string $given): Carbon
    {
        $server = Carbon::today();
        if ($given && preg_match('/^\d{4}-\d{2}-\d{2}$/', $given)) {
            $day = Carbon::parse($given)->startOfDay();
            if ($day->diffInDays($server, true) <= 1) {
                return $day;
            }
        }

        return $server;
    }
}
