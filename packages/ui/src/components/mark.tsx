import { cn } from '@bandzen/ui/lib/utils';

/**
 * The Bandzen mark: band 9 in a tile, the same silhouette as each app's
 * `icon.svg`. A favicon is a flat file and cannot import a component, so the
 * geometry is duplicated there and the two have to change together.
 *
 * One path, not two shapes. The tile and the 9 are a single `evenodd` fill in
 * `currentColor`, so the 9 is a hole rather than a colour: the mark inverts
 * itself against whatever it sits on — dark tile on a paper page, paper tile
 * on the ink footer, correct in both themes — with no literal colours and no
 * `dark:` variant. The 9's counter is a third subpath, so evenodd fills it
 * back in, which is why it survives the knockout.
 *
 * The 9 is a real Archivo SemiBold outline with the transform baked into its
 * coordinates, because subpaths of one path cannot carry their own transform.
 *
 * No chrome tick here, unlike the favicon: the wordmark this sits beside
 * already carries one, and two would read as a stutter. On the ink footer the
 * favicon's version would lose its tile entirely and degrade into a stray 9
 * with a second underline — this is the version that survives that ground.
 *
 * Sized in `em` so it tracks whatever the wordmark next to it is set at.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      focusable="false"
      className={cn('size-[1.4em] shrink-0', className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 0H32V32H0ZM15.831 24.37Q13.521 24.37 12.073 23.492Q10.625 22.614 9.948 21.12Q9.27 19.626 9.27 17.778H13.09Q13.09 18.887 13.382 19.672Q13.675 20.458 14.322 20.874Q14.968 21.289 15.985 21.289Q17.494 21.289 18.249 20.473Q19.004 19.657 19.265 18.132Q19.527 16.608 19.558 14.544Q19.404 14.759 18.803 15.221Q18.203 15.683 17.232 16.053Q16.262 16.423 14.999 16.423Q12.782 16.423 11.365 15.514Q9.948 14.605 9.255 13.019Q8.562 11.433 8.562 9.461Q8.562 7.305 9.486 5.75Q10.41 4.194 12.012 3.347Q13.613 2.5 15.646 2.5Q17.463 2.5 18.911 3.024Q20.359 3.547 21.375 4.733Q22.392 5.919 22.915 7.906Q23.439 9.893 23.439 12.819Q23.439 16.084 22.931 18.317Q22.423 20.55 21.452 21.875Q20.482 23.199 19.065 23.784Q17.648 24.37 15.831 24.37ZM15.862 13.404Q17.032 13.404 17.802 12.896Q18.572 12.388 18.942 11.494Q19.312 10.601 19.312 9.461Q19.312 8.353 18.942 7.475Q18.572 6.597 17.802 6.089Q17.032 5.58 15.862 5.58Q14.691 5.58 13.937 6.104Q13.182 6.628 12.812 7.506Q12.443 8.383 12.443 9.492Q12.443 10.632 12.812 11.51Q13.182 12.388 13.937 12.896Q14.691 13.404 15.862 13.404Z"
      />
    </svg>
  );
}
