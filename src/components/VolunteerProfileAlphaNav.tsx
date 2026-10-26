import {
  firstProfileKeyByLetter,
  PROFILE_ALPHABET,
  profileAnchorId,
  type VolunteerProfile,
} from "@/lib/volunteer-profiles";

export function VolunteerProfileAlphaNav({
  profiles,
}: {
  profiles: Pick<VolunteerProfile, "key" | "name">[];
}) {
  const firstByLetter = firstProfileKeyByLetter(profiles);

  return (
    <nav
      className="mb-2 flex flex-wrap gap-x-0.5 gap-y-0.5 border-b border-slate-100 pb-2"
      aria-label="Jump to profiles by name"
    >
      {PROFILE_ALPHABET.map((letter) => {
        const key = firstByLetter.get(letter);
        if (!key) {
          return (
            <span
              key={letter}
              className="min-w-[1.125rem] px-0.5 text-center text-xs text-slate-300"
              aria-hidden
            >
              {letter}
            </span>
          );
        }

        return (
          <a
            key={letter}
            href={`#${profileAnchorId(key)}`}
            className="min-w-[1.125rem] rounded px-0.5 text-center text-xs font-medium text-blue-700 hover:bg-blue-50 hover:underline"
          >
            {letter}
          </a>
        );
      })}
    </nav>
  );
}