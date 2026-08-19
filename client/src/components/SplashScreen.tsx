import { useEffect, useState } from 'react';

const NAME = 'NEXORA';
const LETTER_MS = 110;
const WIPE_AT = 1650;
const WIPE_MS = 900;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    const wipeTimer = setTimeout(() => setWiping(true), WIPE_AT);
    const doneTimer = setTimeout(onDone, WIPE_AT + WIPE_MS);
    return () => {
      clearTimeout(wipeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100]" aria-hidden>
      <div
        className={`absolute top-0 left-0 h-full w-1/2 bg-gradient-to-br from-teal-700 via-teal-600 to-orange-500 transition-transform duration-[900ms] ease-in-out ${
          wiping ? '-translate-x-full' : ''
        }`}
      />
      <div
        className={`absolute top-0 right-0 h-full w-1/2 bg-gradient-to-br from-teal-800 via-teal-600 to-orange-500 transition-transform duration-[900ms] ease-in-out ${
          wiping ? 'translate-x-full' : ''
        }`}
      />

      <div className={`absolute inset-0 flex flex-col items-center justify-center ${wiping ? 'splash-wipe-name' : ''}`}>
        <div className="flex">
          {NAME.split('').map((ch, i) => (
            <span
              key={i}
              className="splash-letter text-5xl font-extrabold tracking-[0.18em] text-white drop-shadow-lg sm:text-7xl"
              style={{ animationDelay: `${i * LETTER_MS}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>
        <p className="splash-tagline mt-5 text-sm font-medium tracking-[0.45em] text-orange-100 uppercase sm:text-base">
          Plan · Track · Ship
        </p>
      </div>
    </div>
  );
}