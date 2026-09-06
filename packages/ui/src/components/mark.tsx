import { cn } from '@bandzen/ui/lib/utils';

/**
 * The Bandzen mark: band 9 in a tile, the same silhouette as each app's
 * `icon.svg`. A favicon is a flat file and cannot import a component, so the
 * geometry is duplicated there and the two have to change together.
 *
 * One path, not two shapes. The tile and the 9 are a single `evenodd` fill in
 * `currentColor`, so the 9 is a knockout rather than a colour: the mark inverts
 * itself against whatever it sits on — dark tile on a paper page, paper tile
 * on the ink footer, correct in both themes — with no literal colours and no
 * `dark:` variant. The 9's counter is a third subpath, so evenodd fills it
 * back in, which is why it survives the knockout.
 *
 * The 9 is a Geist SemiBold outline with the transform baked into its
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
        d="M0 0H32V32H0ZM15.425 24.463Q12.677 24.463 10.97 23.176Q9.264 21.888 8.57 19.603L12.272 19.372Q12.937 21.223 15.425 21.223Q17.508 21.223 18.65 19.791Q19.793 18.359 19.995 15.149L19.995 15.033Q18.347 17.376 15.078 17.376Q13.053 17.376 11.52 16.494Q9.987 15.611 9.119 14.049Q8.251 12.487 8.251 10.376Q8.251 8.12 9.206 6.456Q10.16 4.793 11.853 3.896Q13.545 3.0 15.772 3.0Q19.851 3.0 21.803 5.603Q23.756 8.206 23.756 12.863Q23.756 16.392 22.902 18.996Q22.049 21.599 20.227 23.031Q18.404 24.463 15.425 24.463ZM15.772 14.425Q17.566 14.425 18.665 13.355Q19.764 12.285 19.764 10.376Q19.764 8.496 18.723 7.324Q17.681 6.153 15.859 6.153Q14.094 6.153 13.082 7.295Q12.07 8.438 12.07 10.347Q12.07 12.227 13.082 13.326Q14.094 14.425 15.772 14.425Z"
      />
    </svg>
  );
}
